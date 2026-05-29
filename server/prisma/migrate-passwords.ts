import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function migratePasswords() {
  console.log('🔐 Starting password migration...');

  const users = await prisma.user.findMany({
    select: { id: true, email: true, password: true },
  });

  let migrated = 0;
  let skipped = 0;

  for (const user of users) {
    // Detect if already hashed (bcrypt hashes start with $2b$ or $2a$)
    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      console.log(`⏭️  Skip ${user.email} — already hashed`);
      skipped++;
      continue;
    }

    try {
      const hashed = await bcrypt.hash(user.password, SALT_ROUNDS);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
      });
      migrated++;
      console.log(`✅ Migrated ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to migrate ${user.email}:`, error);
    }
  }

  console.log(`\n📊 Migration complete: ${migrated} updated, ${skipped} already hashed, total: ${users.length}`);
  await prisma.$disconnect();
}

migratePasswords().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
