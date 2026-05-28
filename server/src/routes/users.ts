import { Router } from 'express';
import bcrypt from 'bcrypt';
import { signToken, requireAuth, adminOnly } from '../middleware/auth';
import { validate, LoginSchema, CreateUserSchema, UpdateUserSchema } from '../validation/schemas';
import { decryptNationalId } from '../lib/crypto';

const router = Router();
import { prisma } from '../lib/prisma';

// ===== AUTH =====
// NOTE: Login rate limiter is applied in index.ts before mounting this router
// at /api/auth/login specifically.

router.post('/login', validate(LoginSchema), async (req, res) => {
  const { email, password } = req.body;
  console.log(`🔑 محاولة دخول: ${email}`);
  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.log(`❌ المستخدم غير موجود: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.active) {
      console.log(`⚠️ محاولة دخول مستخدم معطل: ${email}`);
      return res.status(403).json({ error: 'Account is disabled' });
    }

    // Use bcrypt to compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log(`❌ كلمة مرور خاطئة للمستخدم: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`✅ دخول ناجح: ${user.name}`);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastLoginAt: new Date() },
      include: {
        permissions: {
          select: {
            resource: true,
            canRead: true,
            canWrite: true,
            canDelete: true,
          }
        }
      }
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    const token = signToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      tokenVersion: user.tokenVersion,
    });

    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        tokenVersion: { increment: 1 },
        isOnline: false,
        lastLogoutAt: new Date(),
      },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ===== USERS =====

// Get all users (omit password field)
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        discountLimitPercent: true,
        isOnline: true,
        lastLoginAt: true,
        lastLogoutAt: true,
        createdAt: true,
        permissions: {
          select: {
            resource: true,
            canRead: true,
            canWrite: true,
            canDelete: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user (omit password field)
router.get('/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        discountLimitPercent: true,
        isOnline: true,
        lastLoginAt: true,
        lastLogoutAt: true,
        createdAt: true,
        permissions: {
          select: {
            resource: true,
            canRead: true,
            canWrite: true,
            canDelete: true,
          }
        }
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user (admin only, with validation and password hashing)
router.post('/', requireAuth, adminOnly, validate(CreateUserSchema), async (req, res) => {
  try {
    const { password, permissions, ...rest } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { 
        ...rest, 
        password: hashedPassword,
        permissions: {
          create: permissions || []
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        discountLimitPercent: true,
        createdAt: true,
        permissions: {
          select: {
            resource: true,
            canRead: true,
            canWrite: true,
            canDelete: true,
          }
        }
      }
    });
    res.status(201).json(user);
  } catch (error) {
    console.error('User creation error:', error);
    res.status(400).json({ error: 'Failed to create user' });
  }
});

// Update user (with field allowlist and password hashing)
router.patch('/:id', requireAuth, validate(UpdateUserSchema), async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const isAdmin = req.user!.role === 'system_admin';

  // Non-admins can only update their own profile
  if (!isAdmin && req.user!.userId !== id) {
    return res.status(403).json({ error: 'Cannot update another user' });
  }

  console.log(`📝 محاولة تحديث بيانات المستخدم: ${id}`);
  try {
    const allowedFields = ['name', 'avatar', 'discountLimitPercent', 'active', 'role'];
    const safeData: any = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowedFields.includes(k))
    );

    const permissions = req.body.permissions;

    // Handle password hashing if password is in the update
    if (req.body.password) {
      safeData.password = await bcrypt.hash(req.body.password, 12);
    }

    // Non-admins cannot change role
    if (!isAdmin) {
      delete safeData.role;
    }

    // If role is changing, read the existing user to detect the change
    let existingUser: { role: string } | null = null;
    if (safeData.role) {
      existingUser = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...safeData,
        ...(safeData.role && existingUser && safeData.role !== existingUser.role
          ? { tokenVersion: { increment: 1 } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        discountLimitPercent: true,
        isOnline: true,
        lastLoginAt: true,
        lastLogoutAt: true,
        createdAt: true,
        permissions: {
          select: {
            resource: true,
            canRead: true,
            canWrite: true,
            canDelete: true,
          }
        }
      }
    });

    if (permissions && Array.isArray(permissions)) {
      // Re-create permissions
      await prisma.userPermission.deleteMany({ where: { userId: id } });
      if (permissions.length > 0) {
        await prisma.userPermission.createMany({
          data: permissions.map((p: any) => ({
            userId: id,
            resource: p.resource,
            canRead: p.canRead,
            canWrite: p.canWrite,
            canDelete: p.canDelete
          }))
        });
      }
      
      // Re-fetch user to include the updated permissions
      const updatedUser = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          discountLimitPercent: true,
          isOnline: true,
          lastLoginAt: true,
          lastLogoutAt: true,
          createdAt: true,
          permissions: {
            select: {
              resource: true,
              canRead: true,
              canWrite: true,
              canDelete: true,
            }
          }
        }
      });
      console.log('✅ تم تحديث المستخدم والصلاحيات بنجاح');
      return res.json(updatedUser);
    }

    console.log('✅ تم تحديث المستخدم بنجاح');
    res.json(user);
  } catch (error) {
    console.error('❌ فشل تحديث المستخدم:', error);
    res.status(400).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    if (req.user?.userId === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      return res.status(404).json({ error: 'User not found' });
    }
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete user' });
  }
});

export default router;
