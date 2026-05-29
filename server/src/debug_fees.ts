import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const fees = await prisma.stageFee.findMany();
  console.log('--- Database Records ---');
  console.log(JSON.stringify(fees, null, 2));
  console.log('------------------------');
}

main().catch(console.error).finally(() => prisma.$disconnect());
