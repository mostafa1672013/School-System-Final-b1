import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedUsers() {
  console.log('👤 جاري إضافة المستخدمين...');

  const users = [
    { name: 'أحمد محمد السيد', email: 'admin@school.com', role: 'school_director', password: 'Admin@123' },
    { name: 'فاطمة علي حسن', email: 'head@school.com', role: 'head_accountant', password: 'Head@123' },
    { name: 'محمود إبراهيم نصر', email: 'acc@school.com', role: 'accountant', password: 'Acc@123' },
    { name: 'نورة خالد أحمد', email: 'affairs@school.com', role: 'student_affairs', password: 'Stud@123' },
    { name: 'سامي عبدالله حسين', email: 'store@school.com', role: 'warehouse_keeper', password: 'Ware@123' },
    { name: 'مسؤول النظام', email: 'sysadmin@school.com', role: 'system_admin', password: 'Sys@123' },
  ];

  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, password: hashed, active: true },
      create: { name: u.name, email: u.email, role: u.role, password: hashed, active: true, discountLimitPercent: 20 },
    });
  }

  console.log('✅ تم إضافة 6 مستخدمين.');
}

async function seedInventoryItems() {
  console.log('📦 جاري إضافة أصناف المخزن...');

  const today = new Date().toISOString().split('T')[0];

  const items = [
    { id: 'inv-item-001', name: 'كتاب الرياضيات ابتدائي', category: 'books', itemType: 'sale', quantity: 200, minQuantity: 20, unit: 'نسخة', unitCost: 100, unitPrice: 150, grade: 'primary', lastUpdated: today },
    { id: 'inv-item-002', name: 'كتاب العلوم إعدادي', category: 'books', itemType: 'sale', quantity: 150, minQuantity: 15, unit: 'نسخة', unitCost: 120, unitPrice: 180, grade: 'preparatory', lastUpdated: today },
    { id: 'inv-item-003', name: 'الزي المدرسي الصيفي', category: 'uniform', itemType: 'sale', quantity: 300, minQuantity: 30, unit: 'طقم', unitCost: 250, unitPrice: 350, lastUpdated: today },
    { id: 'inv-item-004', name: 'الزي المدرسي الشتوي', category: 'uniform', itemType: 'sale', quantity: 250, minQuantity: 25, unit: 'طقم', unitCost: 300, unitPrice: 420, lastUpdated: today },
    { id: 'inv-item-005', name: 'أدوات مكتبية', category: 'tools', itemType: 'consumable', quantity: 500, minQuantity: 50, unit: 'قطعة', unitCost: 15, unitPrice: 25, lastUpdated: today },
  ];

  for (const item of items) {
    await prisma.inventoryItem.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  console.log('✅ تم إضافة 5 أصناف مخزن.');
}

async function main() {
  await seedUsers();
  await seedInventoryItems();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
