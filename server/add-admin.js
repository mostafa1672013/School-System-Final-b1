const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@school.com',
      password: '123456',
      role: 'system_admin',
      active: true
    }
  });
  console.log('✅ Admin user created/verified:', user.email);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
