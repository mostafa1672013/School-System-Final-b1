import { prisma } from './lib/prisma';
import bcrypt from 'bcrypt';


async function main() {
  const email = 'admin@school.com';
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log(`❌ User not found with email: ${email}`);
    return;
  }

  console.log('User Details:');
  console.log('ID:', user.id);
  console.log('Name:', user.name);
  console.log('Email:', user.email);
  console.log('Role:', user.role);
  console.log('Active:', user.active);
  console.log('Password hash in DB:', user.password);

  const testPass = '123456';
  const match = await bcrypt.compare(testPass, user.password);
  console.log(`Password match with "${testPass}":`, match);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
