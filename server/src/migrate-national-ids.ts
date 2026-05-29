import { prisma } from './lib/prisma';
import { encryptNationalId, hashNationalId } from './lib/crypto';
import * as dotenv from 'dotenv';
dotenv.config();


async function main() {
  const students = await prisma.student.findMany({
    select: { id: true, nationalId: true },
  });

  let count = 0;
  for (const student of students) {
    // Skip already-encrypted values (they contain ':')
    if (student.nationalId.includes(':')) continue;

    await prisma.student.update({
      where: { id: student.id },
      data: {
        nationalId:     encryptNationalId(student.nationalId),
        nationalIdHash: hashNationalId(student.nationalId),
      },
    });
    count++;
  }
  console.log(`Encrypted ${count} national IDs`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
