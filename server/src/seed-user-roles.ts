import { prisma } from './lib/prisma';
import * as dotenv from 'dotenv';
dotenv.config();


async function main() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, role: true },
  });

  let count = 0;
  for (const user of users) {
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role: user.role } },
      update: {},
      create: { userId: user.id, role: user.role },
    });
    count++;
  }
  console.log(`Seeded ${count} user roles`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
