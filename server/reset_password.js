const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('123456', 12);
  await prisma.user.update({
    where: { email: 'admin@school.com' },
    data: { password: hash }
  });
  console.log('Password reset successfully for admin@school.com to 123456');
}
main().catch(console.error).finally(() => prisma.$disconnect());
