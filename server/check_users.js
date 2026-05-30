const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  console.log(users.map(u => ({ email: u.email, role: u.role, password: u.password })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
