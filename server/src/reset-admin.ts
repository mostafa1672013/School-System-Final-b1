import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetAdmin() {
  const email = 'admin@school.com';
  const plainPassword = '123456';
  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  console.log(`⏳ جاري إنشاء/تحديث حساب المدير (${email})...`);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: 'system_admin',
      active: true,
    },
    create: {
      name: 'مدير النظام',
      email,
      password: hashedPassword,
      role: 'system_admin',
      active: true,
    },
  });

  console.log('✅ تم إعداد حساب المدير بنجاح!');
  console.log(`📧 البريد الإلكتروني: ${email}`);
  console.log(`🔑 كلمة المرور: ${plainPassword}`);
}

resetAdmin()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
