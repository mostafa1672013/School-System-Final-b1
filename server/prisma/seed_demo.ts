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

async function seedAdmittedStudents() {
  console.log('🎓 جاري إضافة الطلاب المُقبَلين...');

  const year = '2024-2025';

  const students = [
    // --- KG Local (12 students) ---
    { nationalId: '31001010000001', name: 'يوسف أحمد السيد', stage: 'kg', grade: 'KG1', track: 'local', guardianName: 'أحمد السيد علي', guardianPhone: '01011111101', tuitionFees: 12000, booksFees: 1500, uniformFees: 1000, totalFees: 14500, status: 'admitted', hasSiblings: false },
    { nationalId: '31001010000002', name: 'مريم محمد حسن', stage: 'kg', grade: 'KG1', track: 'local', guardianName: 'محمد حسن عمر', guardianPhone: '01011111102', tuitionFees: 12000, booksFees: 1500, uniformFees: 1000, totalFees: 14500, status: 'admitted', hasSiblings: true, discountAmount: 1450, discountPercentage: 10, discountApprovedBy: 'أحمد محمد السيد' },
    { nationalId: '31001010000003', name: 'عمر خالد محمود', stage: 'kg', grade: 'KG2', track: 'local', guardianName: 'خالد محمود إبراهيم', guardianPhone: '01011111103', tuitionFees: 12500, booksFees: 1500, uniformFees: 1000, totalFees: 15000, status: 'admitted', hasSiblings: false },
    { nationalId: '31001010000004', name: 'لينا عبدالرحمن عبدالله', stage: 'kg', grade: 'KG2', track: 'local', guardianName: 'عبدالرحمن عبدالله سعيد', guardianPhone: '01011111104', tuitionFees: 12500, booksFees: 1500, uniformFees: 1000, totalFees: 15000, status: 'active', hasSiblings: false },
    { nationalId: '31001010000005', name: 'أدم حسام الدين', stage: 'kg', grade: 'KG1', track: 'local', guardianName: 'حسام الدين محمد', guardianPhone: '01011111105', tuitionFees: 12000, booksFees: 1500, uniformFees: 1000, totalFees: 14500, status: 'active', hasSiblings: true, discountAmount: 1450, discountPercentage: 10, discountApprovedBy: 'أحمد محمد السيد' },
    { nationalId: '31001010000006', name: 'سارة وليد عبدالعزيز', stage: 'kg', grade: 'KG1', track: 'local', guardianName: 'وليد عبدالعزيز حسين', guardianPhone: '01011111106', tuitionFees: 12000, booksFees: 1500, uniformFees: 1000, totalFees: 14500, status: 'admitted', hasSiblings: false },
    { nationalId: '31001010000007', name: 'كريم ماهر محمود', stage: 'kg', grade: 'KG2', track: 'local', guardianName: 'ماهر محمود حسن', guardianPhone: '01011111107', tuitionFees: 12500, booksFees: 1500, uniformFees: 1000, totalFees: 15000, status: 'admitted', hasSiblings: false },
    { nationalId: '31001010000008', name: 'نور الهدى مصطفى', stage: 'kg', grade: 'KG1', track: 'local', guardianName: 'مصطفى علي إبراهيم', guardianPhone: '01011111108', tuitionFees: 12000, booksFees: 1500, uniformFees: 1000, totalFees: 14500, status: 'active', hasSiblings: false },
    { nationalId: '31001010000009', name: 'زياد أمير كمال', stage: 'kg', grade: 'KG2', track: 'local', guardianName: 'أمير كمال نجيب', guardianPhone: '01011111109', tuitionFees: 12500, booksFees: 1500, uniformFees: 1000, totalFees: 15000, status: 'admitted', hasSiblings: false },
    { nationalId: '31001010000010', name: 'ريم إبراهيم فتحي', stage: 'kg', grade: 'KG1', track: 'local', guardianName: 'إبراهيم فتحي سلامة', guardianPhone: '01011111110', tuitionFees: 12000, booksFees: 1500, uniformFees: 1000, totalFees: 14500, status: 'admitted', hasSiblings: true, discountAmount: 1450, discountPercentage: 10, discountApprovedBy: 'أحمد محمد السيد' },
    { nationalId: '31001010000011', name: 'حمزة رامي صلاح', stage: 'kg', grade: 'KG2', track: 'local', guardianName: 'رامي صلاح الدين', guardianPhone: '01011111111', tuitionFees: 12500, booksFees: 1500, uniformFees: 1000, totalFees: 15000, status: 'active', hasSiblings: false },
    { nationalId: '31001010000012', name: 'جنى طارق محمد', stage: 'kg', grade: 'KG1', track: 'local', guardianName: 'طارق محمد يوسف', guardianPhone: '01011111112', tuitionFees: 12000, booksFees: 1500, uniformFees: 1000, totalFees: 14500, status: 'admitted', hasSiblings: false },
    // --- KG International (8 students) ---
    { nationalId: '31001010000013', name: 'ماريا فريد عبدالمجيد', stage: 'kg', grade: 'KG1', track: 'international', guardianName: 'فريد عبدالمجيد رفاعي', guardianPhone: '01011111113', tuitionFees: 25000, booksFees: 3000, uniformFees: 2000, totalFees: 30000, status: 'admitted', hasSiblings: false },
    { nationalId: '31001010000014', name: 'آدم نادر الشريف', stage: 'kg', grade: 'KG1', track: 'international', guardianName: 'نادر الشريف منصور', guardianPhone: '01011111114', tuitionFees: 25000, booksFees: 3000, uniformFees: 2000, totalFees: 30000, status: 'active', hasSiblings: false },
    { nationalId: '31001010000015', name: 'لارا هشام الغامدي', stage: 'kg', grade: 'KG2', track: 'international', guardianName: 'هشام الغامدي طلال', guardianPhone: '01011111115', tuitionFees: 28000, booksFees: 3200, uniformFees: 2000, totalFees: 33200, status: 'admitted', hasSiblings: false },
    { nationalId: '31001010000016', name: 'تيم بشار العلوي', stage: 'kg', grade: 'KG2', track: 'international', guardianName: 'بشار العلوي رياض', guardianPhone: '01011111116', tuitionFees: 28000, booksFees: 3200, uniformFees: 2000, totalFees: 33200, status: 'active', hasSiblings: false },
    { nationalId: '31001010000017', name: 'مايا كريم الزهراني', stage: 'kg', grade: 'KG1', track: 'international', guardianName: 'كريم الزهراني عادل', guardianPhone: '01011111117', tuitionFees: 25000, booksFees: 3000, uniformFees: 2000, totalFees: 30000, status: 'admitted', hasSiblings: false, discountAmount: 4500, discountPercentage: 15, discountApprovedBy: 'أحمد محمد السيد' },
    { nationalId: '31001010000018', name: 'راف جورج أنطون', stage: 'kg', grade: 'KG1', track: 'international', guardianName: 'جورج أنطون حنا', guardianPhone: '01011111118', tuitionFees: 25000, booksFees: 3000, uniformFees: 2000, totalFees: 30000, status: 'admitted', hasSiblings: false },
    { nationalId: '31001010000019', name: 'إيلا سامر الحلبي', stage: 'kg', grade: 'KG2', track: 'international', guardianName: 'سامر الحلبي جهاد', guardianPhone: '01011111119', tuitionFees: 28000, booksFees: 3200, uniformFees: 2000, totalFees: 33200, status: 'admitted', hasSiblings: false },
    { nationalId: '31001010000020', name: 'داني ليون مارتن', stage: 'kg', grade: 'KG2', track: 'international', guardianName: 'ليون مارتن ريمي', guardianPhone: '01011111120', tuitionFees: 28000, booksFees: 3200, uniformFees: 2000, totalFees: 33200, status: 'active', hasSiblings: false },
    // --- Primary Grade 1 (6) ---
    { nationalId: '31002010000021', name: 'علي رضا محمد', stage: 'primary', grade: 'الصف الأول الابتدائي', track: 'local', guardianName: 'رضا محمد حسين', guardianPhone: '01022222101', tuitionFees: 15000, booksFees: 2000, uniformFees: 1200, totalFees: 18200, status: 'active', hasSiblings: false },
    { nationalId: '31002010000022', name: 'نور محمد الشبراوي', stage: 'primary', grade: 'الصف الأول الابتدائي', track: 'local', guardianName: 'محمد الشبراوي علي', guardianPhone: '01022222102', tuitionFees: 15000, booksFees: 2000, uniformFees: 1200, totalFees: 18200, status: 'active', hasSiblings: true, discountAmount: 1820, discountPercentage: 10, discountApprovedBy: 'أحمد محمد السيد' },
    { nationalId: '31002010000023', name: 'أنس سعيد الوكيل', stage: 'primary', grade: 'الصف الأول الابتدائي', track: 'local', guardianName: 'سعيد الوكيل جمال', guardianPhone: '01022222103', tuitionFees: 15000, booksFees: 2000, uniformFees: 1200, totalFees: 18200, status: 'admitted', hasSiblings: false },
    { nationalId: '31002010000024', name: 'دانيا حامد عبدالوهاب', stage: 'primary', grade: 'الصف الأول الابتدائي', track: 'local', guardianName: 'حامد عبدالوهاب حمدي', guardianPhone: '01022222104', tuitionFees: 15000, booksFees: 2000, uniformFees: 1200, totalFees: 18200, status: 'active', hasSiblings: false },
    { nationalId: '31002010000025', name: 'ملك سمير الجندي', stage: 'primary', grade: 'الصف الأول الابتدائي', track: 'local', guardianName: 'سمير الجندي نبيل', guardianPhone: '01022222105', tuitionFees: 15000, booksFees: 2000, uniformFees: 1200, totalFees: 18200, status: 'admitted', hasSiblings: false },
    { nationalId: '31002010000026', name: 'حسن عمر بكر', stage: 'primary', grade: 'الصف الأول الابتدائي', track: 'local', guardianName: 'عمر بكر عثمان', guardianPhone: '01022222106', tuitionFees: 15000, booksFees: 2000, uniformFees: 1200, totalFees: 18200, status: 'active', hasSiblings: false },
    // --- Primary Grade 2 (6) ---
    { nationalId: '31002010000031', name: 'فرح ياسر الصايغ', stage: 'primary', grade: 'الصف الثاني الابتدائي', track: 'local', guardianName: 'ياسر الصايغ حسن', guardianPhone: '01022222131', tuitionFees: 15500, booksFees: 2000, uniformFees: 1200, totalFees: 18700, status: 'active', hasSiblings: false },
    { nationalId: '31002010000032', name: 'يزن إيهاب الطاهر', stage: 'primary', grade: 'الصف الثاني الابتدائي', track: 'local', guardianName: 'إيهاب الطاهر علاء', guardianPhone: '01022222132', tuitionFees: 15500, booksFees: 2000, uniformFees: 1200, totalFees: 18700, status: 'active', hasSiblings: false },
    { nationalId: '31002010000033', name: 'روان أيمن نصار', stage: 'primary', grade: 'الصف الثاني الابتدائي', track: 'local', guardianName: 'أيمن نصار فكري', guardianPhone: '01022222133', tuitionFees: 15500, booksFees: 2000, uniformFees: 1200, totalFees: 18700, status: 'admitted', hasSiblings: true, discountAmount: 1870, discountPercentage: 10, discountApprovedBy: 'أحمد محمد السيد' },
    { nationalId: '31002010000034', name: 'تالة وائل الأنصاري', stage: 'primary', grade: 'الصف الثاني الابتدائي', track: 'local', guardianName: 'وائل الأنصاري صبري', guardianPhone: '01022222134', tuitionFees: 15500, booksFees: 2000, uniformFees: 1200, totalFees: 18700, status: 'active', hasSiblings: false },
    { nationalId: '31002010000035', name: 'عبدالله مؤمن الزيات', stage: 'primary', grade: 'الصف الثاني الابتدائي', track: 'local', guardianName: 'مؤمن الزيات لطفي', guardianPhone: '01022222135', tuitionFees: 15500, booksFees: 2000, uniformFees: 1200, totalFees: 18700, status: 'admitted', hasSiblings: false },
    { nationalId: '31002010000036', name: 'هنا شريف الغزالي', stage: 'primary', grade: 'الصف الثاني الابتدائي', track: 'local', guardianName: 'شريف الغزالي صفوت', guardianPhone: '01022222136', tuitionFees: 15500, booksFees: 2000, uniformFees: 1200, totalFees: 18700, status: 'active', hasSiblings: false },
    // --- Primary Grade 3 (6) ---
    { nationalId: '31002010000041', name: 'محمد صلاح الكيلاني', stage: 'primary', grade: 'الصف الثالث الابتدائي', track: 'local', guardianName: 'صلاح الكيلاني أحمد', guardianPhone: '01022222141', tuitionFees: 16000, booksFees: 2200, uniformFees: 1200, totalFees: 19400, status: 'active', hasSiblings: false },
    { nationalId: '31002010000042', name: 'سلمى ناصر البغدادي', stage: 'primary', grade: 'الصف الثالث الابتدائي', track: 'local', guardianName: 'ناصر البغدادي عمر', guardianPhone: '01022222142', tuitionFees: 16000, booksFees: 2200, uniformFees: 1200, totalFees: 19400, status: 'active', hasSiblings: false },
    { nationalId: '31002010000043', name: 'رافائيل جاد الكريم', stage: 'primary', grade: 'الصف الثالث الابتدائي', track: 'local', guardianName: 'جاد الكريم ميلاد', guardianPhone: '01022222143', tuitionFees: 16000, booksFees: 2200, uniformFees: 1200, totalFees: 19400, status: 'admitted', hasSiblings: false },
    { nationalId: '31002010000044', name: 'ندى علاء الراشد', stage: 'primary', grade: 'الصف الثالث الابتدائي', track: 'local', guardianName: 'علاء الراشد منير', guardianPhone: '01022222144', tuitionFees: 16000, booksFees: 2200, uniformFees: 1200, totalFees: 19400, status: 'active', hasSiblings: true, discountAmount: 1940, discountPercentage: 10, discountApprovedBy: 'أحمد محمد السيد' },
    { nationalId: '31002010000045', name: 'جاد عبدالسلام يونس', stage: 'primary', grade: 'الصف الثالث الابتدائي', track: 'local', guardianName: 'عبدالسلام يونس هاشم', guardianPhone: '01022222145', tuitionFees: 16000, booksFees: 2200, uniformFees: 1200, totalFees: 19400, status: 'admitted', hasSiblings: false },
    { nationalId: '31002010000046', name: 'ياسمين أشرف مصيلحي', stage: 'primary', grade: 'الصف الثالث الابتدائي', track: 'local', guardianName: 'أشرف مصيلحي حسن', guardianPhone: '01022222146', tuitionFees: 16000, booksFees: 2200, uniformFees: 1200, totalFees: 19400, status: 'active', hasSiblings: false },
    // --- Primary Grade 4 (6) ---
    { nationalId: '31002010000051', name: 'عمار فادي حجازي', stage: 'primary', grade: 'الصف الرابع الابتدائي', track: 'local', guardianName: 'فادي حجازي سليم', guardianPhone: '01022222151', tuitionFees: 16500, booksFees: 2200, uniformFees: 1200, totalFees: 19900, status: 'active', hasSiblings: false },
    { nationalId: '31002010000052', name: 'مودة زياد بدوي', stage: 'primary', grade: 'الصف الرابع الابتدائي', track: 'local', guardianName: 'زياد بدوي صبري', guardianPhone: '01022222152', tuitionFees: 16500, booksFees: 2200, uniformFees: 1200, totalFees: 19900, status: 'active', hasSiblings: false },
    { nationalId: '31002010000053', name: 'إياد تامر حميدة', stage: 'primary', grade: 'الصف الرابع الابتدائي', track: 'local', guardianName: 'تامر حميدة خيري', guardianPhone: '01022222153', tuitionFees: 16500, booksFees: 2200, uniformFees: 1200, totalFees: 19900, status: 'admitted', hasSiblings: true, discountAmount: 1990, discountPercentage: 10, discountApprovedBy: 'أحمد محمد السيد' },
    { nationalId: '31002010000054', name: 'شيماء جمال طلعت', stage: 'primary', grade: 'الصف الرابع الابتدائي', track: 'local', guardianName: 'جمال طلعت حافظ', guardianPhone: '01022222154', tuitionFees: 16500, booksFees: 2200, uniformFees: 1200, totalFees: 19900, status: 'active', hasSiblings: false },
    { nationalId: '31002010000055', name: 'أمير كمال درويش', stage: 'primary', grade: 'الصف الرابع الابتدائي', track: 'local', guardianName: 'كمال درويش نزيه', guardianPhone: '01022222155', tuitionFees: 16500, booksFees: 2200, uniformFees: 1200, totalFees: 19900, status: 'admitted', hasSiblings: false },
    { nationalId: '31002010000056', name: 'بسمة حسني رزق', stage: 'primary', grade: 'الصف الرابع الابتدائي', track: 'local', guardianName: 'حسني رزق عبدالحميد', guardianPhone: '01022222156', tuitionFees: 16500, booksFees: 2200, uniformFees: 1200, totalFees: 19900, status: 'active', hasSiblings: false },
    // --- Primary Grade 5 (6) ---
    { nationalId: '31002010000061', name: 'نادر هاني النجار', stage: 'primary', grade: 'الصف الخامس الابتدائي', track: 'local', guardianName: 'هاني النجار مصطفى', guardianPhone: '01022222161', tuitionFees: 17000, booksFees: 2300, uniformFees: 1200, totalFees: 20500, status: 'active', hasSiblings: false },
    { nationalId: '31002010000062', name: 'غزل سالم الطيب', stage: 'primary', grade: 'الصف الخامس الابتدائي', track: 'local', guardianName: 'سالم الطيب رشاد', guardianPhone: '01022222162', tuitionFees: 17000, booksFees: 2300, uniformFees: 1200, totalFees: 20500, status: 'active', hasSiblings: false },
    { nationalId: '31002010000063', name: 'سيف رفعت شلبي', stage: 'primary', grade: 'الصف الخامس الابتدائي', track: 'local', guardianName: 'رفعت شلبي كامل', guardianPhone: '01022222163', tuitionFees: 17000, booksFees: 2300, uniformFees: 1200, totalFees: 20500, status: 'admitted', hasSiblings: false },
    { nationalId: '31002010000064', name: 'ليلى مدحت السقا', stage: 'primary', grade: 'الصف الخامس الابتدائي', track: 'local', guardianName: 'مدحت السقا وليد', guardianPhone: '01022222164', tuitionFees: 17000, booksFees: 2300, uniformFees: 1200, totalFees: 20500, status: 'active', hasSiblings: true, discountAmount: 2050, discountPercentage: 10, discountApprovedBy: 'أحمد محمد السيد' },
    { nationalId: '31002010000065', name: 'مصطفى عادل عبدالنبي', stage: 'primary', grade: 'الصف الخامس الابتدائي', track: 'local', guardianName: 'عادل عبدالنبي محمود', guardianPhone: '01022222165', tuitionFees: 17000, booksFees: 2300, uniformFees: 1200, totalFees: 20500, status: 'admitted', hasSiblings: false },
    { nationalId: '31002010000066', name: 'نيرة هيثم حجاج', stage: 'primary', grade: 'الصف الخامس الابتدائي', track: 'local', guardianName: 'هيثم حجاج صفوت', guardianPhone: '01022222166', tuitionFees: 17000, booksFees: 2300, uniformFees: 1200, totalFees: 20500, status: 'active', hasSiblings: false },
    // --- Primary Grade 6 (6) ---
    { nationalId: '31002010000071', name: 'محمود إسلام السيوطي', stage: 'primary', grade: 'الصف السادس الابتدائي', track: 'local', guardianName: 'إسلام السيوطي خالد', guardianPhone: '01022222171', tuitionFees: 18000, booksFees: 2500, uniformFees: 1200, totalFees: 21700, status: 'active', hasSiblings: false },
    { nationalId: '31002010000072', name: 'هديل عصام مرسي', stage: 'primary', grade: 'الصف السادس الابتدائي', track: 'local', guardianName: 'عصام مرسي فتحي', guardianPhone: '01022222172', tuitionFees: 18000, booksFees: 2500, uniformFees: 1200, totalFees: 21700, status: 'active', hasSiblings: false },
    { nationalId: '31002010000073', name: 'يوسف منير الديب', stage: 'primary', grade: 'الصف السادس الابتدائي', track: 'local', guardianName: 'منير الديب حسن', guardianPhone: '01022222173', tuitionFees: 18000, booksFees: 2500, uniformFees: 1200, totalFees: 21700, status: 'admitted', hasSiblings: false },
    { nationalId: '31002010000074', name: 'زينة ثروت العبادي', stage: 'primary', grade: 'الصف السادس الابتدائي', track: 'local', guardianName: 'ثروت العبادي أيمن', guardianPhone: '01022222174', tuitionFees: 18000, booksFees: 2500, uniformFees: 1200, totalFees: 21700, status: 'active', hasSiblings: false, discountAmount: 3260, discountPercentage: 15, discountApprovedBy: 'أحمد محمد السيد' },
    { nationalId: '31002010000075', name: 'كنان محمد إدريس', stage: 'primary', grade: 'الصف السادس الابتدائي', track: 'local', guardianName: 'محمد إدريس عبدالله', guardianPhone: '01022222175', tuitionFees: 18000, booksFees: 2500, uniformFees: 1200, totalFees: 21700, status: 'admitted', hasSiblings: false },
    { nationalId: '31002010000076', name: 'سجى طلعت خطاب', stage: 'primary', grade: 'الصف السادس الابتدائي', track: 'local', guardianName: 'طلعت خطاب منصور', guardianPhone: '01022222176', tuitionFees: 18000, booksFees: 2500, uniformFees: 1200, totalFees: 21700, status: 'active', hasSiblings: false },
    // --- Preparatory Grade 1 (6) ---
    { nationalId: '31003010000081', name: 'إبراهيم أسامة النجار', stage: 'preparatory', grade: 'الصف الأول الإعدادي', track: 'local', guardianName: 'أسامة النجار حاتم', guardianPhone: '01033333181', tuitionFees: 20000, booksFees: 3000, uniformFees: 1500, busFees: 2400, totalFees: 26900, status: 'active', hasSiblings: false },
    { nationalId: '31003010000082', name: 'مي أحمد شحاتة', stage: 'preparatory', grade: 'الصف الأول الإعدادي', track: 'local', guardianName: 'أحمد شحاتة رفاعي', guardianPhone: '01033333182', tuitionFees: 20000, booksFees: 3000, uniformFees: 1500, busFees: 2400, totalFees: 26900, status: 'active', hasSiblings: false },
    { nationalId: '31003010000083', name: 'يحيى بسام الشيخ', stage: 'preparatory', grade: 'الصف الأول الإعدادي', track: 'local', guardianName: 'بسام الشيخ وليد', guardianPhone: '01033333183', tuitionFees: 20000, booksFees: 3000, uniformFees: 1500, totalFees: 24500, status: 'admitted', hasSiblings: false },
    { nationalId: '31003010000084', name: 'هيا عمرو حداد', stage: 'preparatory', grade: 'الصف الأول الإعدادي', track: 'local', guardianName: 'عمرو حداد باهر', guardianPhone: '01033333184', tuitionFees: 20000, booksFees: 3000, uniformFees: 1500, busFees: 2400, totalFees: 26900, status: 'active', hasSiblings: true, discountAmount: 2690, discountPercentage: 10, discountApprovedBy: 'أحمد محمد السيد' },
    { nationalId: '31003010000085', name: 'شادي فيصل الحسن', stage: 'preparatory', grade: 'الصف الأول الإعدادي', track: 'local', guardianName: 'فيصل الحسن عبدالله', guardianPhone: '01033333185', tuitionFees: 20000, booksFees: 3000, uniformFees: 1500, totalFees: 24500, status: 'admitted', hasSiblings: false },
    { nationalId: '31003010000086', name: 'نيلوفر كريم عزت', stage: 'preparatory', grade: 'الصف الأول الإعدادي', track: 'local', guardianName: 'كريم عزت طاهر', guardianPhone: '01033333186', tuitionFees: 20000, booksFees: 3000, uniformFees: 1500, busFees: 2400, totalFees: 26900, status: 'active', hasSiblings: false },
    // --- Preparatory Grade 2 (6) ---
    { nationalId: '31003010000091', name: 'أيوب رشاد الشيمي', stage: 'preparatory', grade: 'الصف الثاني الإعدادي', track: 'local', guardianName: 'رشاد الشيمي عوض', guardianPhone: '01033333191', tuitionFees: 21000, booksFees: 3000, uniformFees: 1500, busFees: 2400, totalFees: 27900, status: 'active', hasSiblings: false },
    { nationalId: '31003010000092', name: 'كاميليا سامح رشدي', stage: 'preparatory', grade: 'الصف الثاني الإعدادي', track: 'local', guardianName: 'سامح رشدي مجدي', guardianPhone: '01033333192', tuitionFees: 21000, booksFees: 3000, uniformFees: 1500, totalFees: 25500, status: 'active', hasSiblings: false },
    { nationalId: '31003010000093', name: 'زيد مازن قاسم', stage: 'preparatory', grade: 'الصف الثاني الإعدادي', track: 'local', guardianName: 'مازن قاسم إسماعيل', guardianPhone: '01033333193', tuitionFees: 21000, booksFees: 3000, uniformFees: 1500, busFees: 2400, totalFees: 27900, status: 'admitted', hasSiblings: false },
    { nationalId: '31003010000094', name: 'تسنيم حسين الهمشري', stage: 'preparatory', grade: 'الصف الثاني الإعدادي', track: 'local', guardianName: 'حسين الهمشري فتحي', guardianPhone: '01033333194', tuitionFees: 21000, booksFees: 3000, uniformFees: 1500, totalFees: 25500, status: 'active', hasSiblings: true, discountAmount: 2550, discountPercentage: 10, discountApprovedBy: 'أحمد محمد السيد' },
    { nationalId: '31003010000095', name: 'بلال رامز الأطرش', stage: 'preparatory', grade: 'الصف الثاني الإعدادي', track: 'local', guardianName: 'رامز الأطرش علي', guardianPhone: '01033333195', tuitionFees: 21000, booksFees: 3000, uniformFees: 1500, busFees: 2400, totalFees: 27900, status: 'admitted', hasSiblings: false },
    { nationalId: '31003010000096', name: 'آية خالد المتولي', stage: 'preparatory', grade: 'الصف الثاني الإعدادي', track: 'local', guardianName: 'خالد المتولي صالح', guardianPhone: '01033333196', tuitionFees: 21000, booksFees: 3000, uniformFees: 1500, busFees: 2400, totalFees: 27900, status: 'active', hasSiblings: false },
    // --- Preparatory Grade 3 (6) ---
    { nationalId: '31003010000101', name: 'معاذ طارق الدسوقي', stage: 'preparatory', grade: 'الصف الثالث الإعدادي', track: 'local', guardianName: 'طارق الدسوقي علاء', guardianPhone: '01033333201', tuitionFees: 22000, booksFees: 3200, uniformFees: 1500, busFees: 2400, totalFees: 29100, status: 'active', hasSiblings: false },
    { nationalId: '31003010000102', name: 'لجين فريد البنا', stage: 'preparatory', grade: 'الصف الثالث الإعدادي', track: 'local', guardianName: 'فريد البنا محمود', guardianPhone: '01033333202', tuitionFees: 22000, booksFees: 3200, uniformFees: 1500, totalFees: 26700, status: 'active', hasSiblings: false },
    { nationalId: '31003010000103', name: 'ريان أنور الحموي', stage: 'preparatory', grade: 'الصف الثالث الإعدادي', track: 'local', guardianName: 'أنور الحموي شريف', guardianPhone: '01033333203', tuitionFees: 22000, booksFees: 3200, uniformFees: 1500, busFees: 2400, totalFees: 29100, status: 'admitted', hasSiblings: false },
    { nationalId: '31003010000104', name: 'إيناس عبدالعزيز رضا', stage: 'preparatory', grade: 'الصف الثالث الإعدادي', track: 'local', guardianName: 'عبدالعزيز رضا كامل', guardianPhone: '01033333204', tuitionFees: 22000, booksFees: 3200, uniformFees: 1500, totalFees: 26700, status: 'active', hasSiblings: false },
    { nationalId: '31003010000105', name: 'حمدي رضوان شوقي', stage: 'preparatory', grade: 'الصف الثالث الإعدادي', track: 'local', guardianName: 'رضوان شوقي ثروت', guardianPhone: '01033333205', tuitionFees: 22000, booksFees: 3200, uniformFees: 1500, busFees: 2400, totalFees: 29100, status: 'admitted', hasSiblings: true, discountAmount: 2910, discountPercentage: 10, discountApprovedBy: 'أحمد محمد السيد' },
    { nationalId: '31003010000106', name: 'ألاء منصور الربيعي', stage: 'preparatory', grade: 'الصف الثالث الإعدادي', track: 'local', guardianName: 'منصور الربيعي ياسر', guardianPhone: '01033333206', tuitionFees: 22000, booksFees: 3200, uniformFees: 1500, busFees: 2400, totalFees: 29100, status: 'active', hasSiblings: false },
    // --- Secondary Grade 1 (6) ---
    { nationalId: '31004010000111', name: 'مالك إبراهيم الحلو', stage: 'secondary', grade: 'الصف الأول الثانوي', track: 'local', guardianName: 'إبراهيم الحلو سمير', guardianPhone: '01044444211', tuitionFees: 25000, booksFees: 3500, uniformFees: 1500, busFees: 2400, totalFees: 32400, status: 'active', hasSiblings: false },
    { nationalId: '31004010000112', name: 'درة عادل الشهاوي', stage: 'secondary', grade: 'الصف الأول الثانوي', track: 'local', guardianName: 'عادل الشهاوي نبيل', guardianPhone: '01044444212', tuitionFees: 25000, booksFees: 3500, uniformFees: 1500, totalFees: 30000, status: 'active', hasSiblings: false },
    { nationalId: '31004010000113', name: 'مصطفى جمال بيومي', stage: 'secondary', grade: 'الصف الأول الثانوي', track: 'local', guardianName: 'جمال بيومي حلمي', guardianPhone: '01044444213', tuitionFees: 25000, booksFees: 3500, uniformFees: 1500, busFees: 2400, totalFees: 32400, status: 'admitted', hasSiblings: false },
    { nationalId: '31004010000114', name: 'هاجر يسري الشرقاوي', stage: 'secondary', grade: 'الصف الأول الثانوي', track: 'local', guardianName: 'يسري الشرقاوي علي', guardianPhone: '01044444214', tuitionFees: 25000, booksFees: 3500, uniformFees: 1500, totalFees: 30000, status: 'active', hasSiblings: false, discountAmount: 4500, discountPercentage: 15, discountApprovedBy: 'أحمد محمد السيد' },
    { nationalId: '31004010000115', name: 'جهاد نبيل العكاوي', stage: 'secondary', grade: 'الصف الأول الثانوي', track: 'local', guardianName: 'نبيل العكاوي سلمان', guardianPhone: '01044444215', tuitionFees: 25000, booksFees: 3500, uniformFees: 1500, busFees: 2400, totalFees: 32400, status: 'admitted', hasSiblings: false },
    { nationalId: '31004010000116', name: 'تمارا حسن زيدان', stage: 'secondary', grade: 'الصف الأول الثانوي', track: 'local', guardianName: 'حسن زيدان مروان', guardianPhone: '01044444216', tuitionFees: 25000, booksFees: 3500, uniformFees: 1500, busFees: 2400, totalFees: 32400, status: 'active', hasSiblings: false },
    // --- Secondary Grade 2 (6) ---
    { nationalId: '31004010000121', name: 'أحمد رمزي العقاد', stage: 'secondary', grade: 'الصف الثاني الثانوي', track: 'local', guardianName: 'رمزي العقاد حافظ', guardianPhone: '01044444221', tuitionFees: 27000, booksFees: 3800, uniformFees: 1500, busFees: 2400, totalFees: 34700, status: 'active', hasSiblings: false },
    { nationalId: '31004010000122', name: 'ميار سيف الإسلام', stage: 'secondary', grade: 'الصف الثاني الثانوي', track: 'local', guardianName: 'سيف الإسلام صلاح', guardianPhone: '01044444222', tuitionFees: 27000, booksFees: 3800, uniformFees: 1500, totalFees: 32300, status: 'active', hasSiblings: false },
    { nationalId: '31004010000123', name: 'سليمان محمود الخضر', stage: 'secondary', grade: 'الصف الثاني الثانوي', track: 'local', guardianName: 'محمود الخضر إبراهيم', guardianPhone: '01044444223', tuitionFees: 27000, booksFees: 3800, uniformFees: 1500, busFees: 2400, totalFees: 34700, status: 'admitted', hasSiblings: false },
    { nationalId: '31004010000124', name: 'يمنى علي الصغير', stage: 'secondary', grade: 'الصف الثاني الثانوي', track: 'local', guardianName: 'علي الصغير مصطفى', guardianPhone: '01044444224', tuitionFees: 27000, booksFees: 3800, uniformFees: 1500, totalFees: 32300, status: 'active', hasSiblings: true, discountAmount: 3230, discountPercentage: 10, discountApprovedBy: 'أحمد محمد السيد' },
    { nationalId: '31004010000125', name: 'منار صبحي الديناري', stage: 'secondary', grade: 'الصف الثاني الثانوي', track: 'local', guardianName: 'صبحي الديناري خالد', guardianPhone: '01044444225', tuitionFees: 27000, booksFees: 3800, uniformFees: 1500, busFees: 2400, totalFees: 34700, status: 'admitted', hasSiblings: false },
    { nationalId: '31004010000126', name: 'لقمان إسماعيل جبر', stage: 'secondary', grade: 'الصف الثاني الثانوي', track: 'local', guardianName: 'إسماعيل جبر عيسى', guardianPhone: '01044444226', tuitionFees: 27000, booksFees: 3800, uniformFees: 1500, busFees: 2400, totalFees: 34700, status: 'active', hasSiblings: false },
    // --- Secondary Grade 3 (6) ---
    { nationalId: '31004010000131', name: 'عبدالرحمن قاسم الحربي', stage: 'secondary', grade: 'الصف الثالث الثانوي', track: 'local', guardianName: 'قاسم الحربي سليمان', guardianPhone: '01044444231', tuitionFees: 30000, booksFees: 4000, uniformFees: 1500, busFees: 2400, totalFees: 37900, status: 'active', hasSiblings: false },
    { nationalId: '31004010000132', name: 'أسماء علاء الزرقاني', stage: 'secondary', grade: 'الصف الثالث الثانوي', track: 'local', guardianName: 'علاء الزرقاني محمود', guardianPhone: '01044444232', tuitionFees: 30000, booksFees: 4000, uniformFees: 1500, totalFees: 35500, status: 'active', hasSiblings: false },
    { nationalId: '31004010000133', name: 'ماجد يحيى الشنواني', stage: 'secondary', grade: 'الصف الثالث الثانوي', track: 'local', guardianName: 'يحيى الشنواني سعد', guardianPhone: '01044444233', tuitionFees: 30000, booksFees: 4000, uniformFees: 1500, busFees: 2400, totalFees: 37900, status: 'admitted', hasSiblings: false },
    { nationalId: '31004010000134', name: 'منى بشير الشافعي', stage: 'secondary', grade: 'الصف الثالث الثانوي', track: 'local', guardianName: 'بشير الشافعي يوسف', guardianPhone: '01044444234', tuitionFees: 30000, booksFees: 4000, uniformFees: 1500, totalFees: 35500, status: 'active', hasSiblings: false, discountAmount: 7100, discountPercentage: 20, discountApprovedBy: 'أحمد محمد السيد' },
    { nationalId: '31004010000135', name: 'زكريا فارس عبدالله', stage: 'secondary', grade: 'الصف الثالث الثانوي', track: 'local', guardianName: 'فارس عبدالله عمر', guardianPhone: '01044444235', tuitionFees: 30000, booksFees: 4000, uniformFees: 1500, busFees: 2400, totalFees: 37900, status: 'admitted', hasSiblings: false },
    { nationalId: '31004010000136', name: 'رنا محمد الشامي', stage: 'secondary', grade: 'الصف الثالث الثانوي', track: 'local', guardianName: 'محمد الشامي ياسر', guardianPhone: '01044444236', tuitionFees: 30000, booksFees: 4000, uniformFees: 1500, busFees: 2400, totalFees: 37900, status: 'active', hasSiblings: false },
  ];

  for (const s of students) {
    await prisma.student.upsert({
      where: { nationalId: s.nationalId },
      update: { ...s, academicYear: year },
      create: { ...s, academicYear: year },
    });
  }

  console.log(`✅ تم إضافة ${students.length} طالب مُقبَّل.`);
}

async function seedPendingStudents() {
  console.log('📋 جاري إضافة طلاب التقديم...');
  const year = '2024-2025';
  const students = [
    { nationalId: '31005010000201', name: 'إسلام محمود السيد', stage: 'kg', grade: 'KG1', track: 'local', guardianName: 'محمود السيد عبدالله', guardianPhone: '01055555201', status: 'applied', hasSiblings: false },
    { nationalId: '31005010000202', name: 'مروة سعيد الديب', stage: 'kg', grade: 'KG2', track: 'local', guardianName: 'سعيد الديب طاهر', guardianPhone: '01055555202', status: 'applied', hasSiblings: false },
    { nationalId: '31005010000203', name: 'حازم عصام الأمير', stage: 'primary', grade: 'الصف الأول الابتدائي', track: 'local', guardianName: 'عصام الأمير رشاد', guardianPhone: '01055555203', status: 'applied', hasSiblings: false },
    { nationalId: '31005010000204', name: 'إيمان تامر الكردي', stage: 'primary', grade: 'الصف الثاني الابتدائي', track: 'local', guardianName: 'تامر الكردي وليد', guardianPhone: '01055555204', status: 'applied', hasSiblings: false },
    { nationalId: '31005010000205', name: 'سعد يوسف البدوي', stage: 'kg', grade: 'KG1', track: 'international', guardianName: 'يوسف البدوي سامر', guardianPhone: '01055555205', status: 'applied', hasSiblings: false },
    { nationalId: '31005010000211', name: 'نادية حسن الجمال', stage: 'kg', grade: 'KG1', track: 'local', guardianName: 'حسن الجمال علي', guardianPhone: '01055555211', status: 'under_testing', hasSiblings: false },
    { nationalId: '31005010000212', name: 'طارق فتحي النخيلي', stage: 'primary', grade: 'الصف الأول الابتدائي', track: 'local', guardianName: 'فتحي النخيلي أحمد', guardianPhone: '01055555212', status: 'under_testing', hasSiblings: false },
    { nationalId: '31005010000213', name: 'أميرة خليل السبكي', stage: 'primary', grade: 'الصف الثالث الابتدائي', track: 'local', guardianName: 'خليل السبكي عمر', guardianPhone: '01055555213', status: 'under_testing', hasSiblings: false },
    { nationalId: '31005010000214', name: 'ياسر محمد الفندي', stage: 'kg', grade: 'KG2', track: 'local', guardianName: 'محمد الفندي طلعت', guardianPhone: '01055555214', status: 'under_testing', hasSiblings: false },
    { nationalId: '31005010000215', name: 'ربا سمير مرقس', stage: 'primary', grade: 'الصف الثاني الابتدائي', track: 'local', guardianName: 'سمير مرقس ميلاد', guardianPhone: '01055555215', status: 'under_testing', hasSiblings: false },
  ];
  for (const s of students) {
    await prisma.student.upsert({
      where: { nationalId: s.nationalId },
      update: { ...s, academicYear: year },
      create: { ...s, academicYear: year, tuitionFees: 0, booksFees: 0, uniformFees: 0, totalFees: 0 },
    });
  }
  console.log(`✅ تم إضافة ${students.length} طالب في مرحلة التقديم.`);
}

async function seedPromotedStudents() {
  console.log('🔄 جاري إضافة الطلاب المُرقَّين من 2023-2024...');
  const year = '2024-2025';
  const oldYear = '2023-2024';
  const promoted = [
    { nationalId: '31006010000301', name: 'ثابت محمود الزهراني', stage: 'primary', grade: 'الصف الثالث الابتدائي', track: 'local', guardianName: 'محمود الزهراني يوسف', guardianPhone: '01066666301', tuitionFees: 16000, booksFees: 2200, uniformFees: 1200, totalFees: 19400, arrearsFees: 5000, paidAmount: 0, status: 'admitted', hasSiblings: false, oldStage: 'primary', oldGrade: 'الصف الثاني الابتدائي', oldTuitionFees: 15500, oldBooksFees: 2000, oldUniformFees: 1200, oldTotalFees: 18700, oldPaidAmount: 13700 },
    { nationalId: '31006010000302', name: 'مسرة علي الحكيم', stage: 'primary', grade: 'الصف الخامس الابتدائي', track: 'local', guardianName: 'علي الحكيم محمود', guardianPhone: '01066666302', tuitionFees: 17000, booksFees: 2300, uniformFees: 1200, totalFees: 20500, arrearsFees: 7500, paidAmount: 0, status: 'admitted', hasSiblings: false, oldStage: 'primary', oldGrade: 'الصف الرابع الابتدائي', oldTuitionFees: 16500, oldBooksFees: 2200, oldUniformFees: 1200, oldTotalFees: 19900, oldPaidAmount: 12400 },
    { nationalId: '31006010000303', name: 'صفاء حسين الشربيني', stage: 'preparatory', grade: 'الصف الأول الإعدادي', track: 'local', guardianName: 'حسين الشربيني علاء', guardianPhone: '01066666303', tuitionFees: 20000, booksFees: 3000, uniformFees: 1500, totalFees: 24500, arrearsFees: 4000, paidAmount: 0, status: 'admitted', hasSiblings: false, oldStage: 'primary', oldGrade: 'الصف السادس الابتدائي', oldTuitionFees: 18000, oldBooksFees: 2500, oldUniformFees: 1200, oldTotalFees: 21700, oldPaidAmount: 17700 },
    { nationalId: '31006010000304', name: 'عزيزة رامي الصادق', stage: 'preparatory', grade: 'الصف الثاني الإعدادي', track: 'local', guardianName: 'رامي الصادق مصطفى', guardianPhone: '01066666304', tuitionFees: 21000, booksFees: 3000, uniformFees: 1500, totalFees: 25500, arrearsFees: 6000, paidAmount: 0, status: 'admitted', hasSiblings: false, oldStage: 'preparatory', oldGrade: 'الصف الأول الإعدادي', oldTuitionFees: 20000, oldBooksFees: 3000, oldUniformFees: 1500, oldTotalFees: 24500, oldPaidAmount: 18500 },
    { nationalId: '31006010000305', name: 'ضياء الدين حامد رشاد', stage: 'secondary', grade: 'الصف الأول الثانوي', track: 'local', guardianName: 'حامد رشاد كمال', guardianPhone: '01066666305', tuitionFees: 25000, booksFees: 3500, uniformFees: 1500, totalFees: 30000, arrearsFees: 9000, paidAmount: 0, status: 'admitted', hasSiblings: false, oldStage: 'preparatory', oldGrade: 'الصف الثالث الإعدادي', oldTuitionFees: 22000, oldBooksFees: 3200, oldUniformFees: 1500, oldTotalFees: 26700, oldPaidAmount: 17700 },
    { nationalId: '31006010000306', name: 'وسن طاهر البشير', stage: 'secondary', grade: 'الصف الثاني الثانوي', track: 'local', guardianName: 'طاهر البشير يوسف', guardianPhone: '01066666306', tuitionFees: 27000, booksFees: 3800, uniformFees: 1500, totalFees: 32300, arrearsFees: 8500, paidAmount: 0, status: 'admitted', hasSiblings: false, oldStage: 'secondary', oldGrade: 'الصف الأول الثانوي', oldTuitionFees: 25000, oldBooksFees: 3500, oldUniformFees: 1500, oldTotalFees: 30000, oldPaidAmount: 21500 },
    { nationalId: '31006010000307', name: 'فراس نزار الخوري', stage: 'secondary', grade: 'الصف الثالث الثانوي', track: 'local', guardianName: 'نزار الخوري سامي', guardianPhone: '01066666307', tuitionFees: 30000, booksFees: 4000, uniformFees: 1500, totalFees: 35500, arrearsFees: 12000, paidAmount: 0, status: 'admitted', hasSiblings: false, oldStage: 'secondary', oldGrade: 'الصف الثاني الثانوي', oldTuitionFees: 27000, oldBooksFees: 3800, oldUniformFees: 1500, oldTotalFees: 32300, oldPaidAmount: 20300 },
    { nationalId: '31006010000308', name: 'غادة سليم الطوخي', stage: 'primary', grade: 'الصف الرابع الابتدائي', track: 'local', guardianName: 'سليم الطوخي فتحي', guardianPhone: '01066666308', tuitionFees: 16500, booksFees: 2200, uniformFees: 1200, totalFees: 19900, arrearsFees: 3500, paidAmount: 0, status: 'admitted', hasSiblings: false, oldStage: 'primary', oldGrade: 'الصف الثالث الابتدائي', oldTuitionFees: 16000, oldBooksFees: 2200, oldUniformFees: 1200, oldTotalFees: 19400, oldPaidAmount: 15900 },
  ];
  for (const s of promoted) {
    const { oldStage, oldGrade, oldTuitionFees, oldBooksFees, oldUniformFees, oldTotalFees, oldPaidAmount, ...studentData } = s;
    const student = await prisma.student.upsert({
      where: { nationalId: s.nationalId },
      update: { ...studentData, academicYear: year },
      create: { ...studentData, academicYear: year },
    });
    await prisma.studentYearlyFinance.upsert({
      where: { studentId_academicYear: { studentId: student.id, academicYear: oldYear } },
      update: { paidAmount: oldPaidAmount },
      create: { studentId: student.id, academicYear: oldYear, stage: oldStage, grade: oldGrade, tuitionFees: oldTuitionFees, booksFees: oldBooksFees, uniformFees: oldUniformFees, busFees: 0, otherFees: 0, arrearsFees: 0, totalFees: oldTotalFees, paidAmount: oldPaidAmount },
    });
  }
  console.log(`✅ تم إضافة ${promoted.length} طالب مُرقَّى مع سجل مالي 2023-2024.`);
}

async function seedPayments() {
  console.log('💰 جاري إضافة المدفوعات وطلبات الدفع...');
  const year = '2024-2025';
  const paidIds = ['31001010000001','31001010000003','31001010000004','31001010000006','31001010000008','31001010000013','31001010000014','31001010000015','31002010000021','31002010000022','31002010000024','31002010000026','31002010000031','31002010000032','31002010000034','31002010000036','31002010000041','31002010000042','31002010000044','31002010000046','31002010000051','31002010000052','31002010000054','31002010000056','31003010000081','31003010000082','31003010000084','31003010000086','31003010000091','31003010000092','31003010000094','31003010000096','31004010000111','31004010000112','31004010000114','31004010000116','31004010000121','31004010000122','31004010000124','31004010000126','31004010000131','31004010000132','31004010000134','31004010000136'];
  const pendingIds = ['31001010000007','31001010000009','31001010000011','31002010000023','31002010000025','31002010000033','31002010000035','31003010000083','31003010000085','31003010000093','31003010000095','31004010000113','31004010000115','31004010000123','31004010000125'];
  let counter = 2000;
  for (const nationalId of paidIds) {
    const student = await prisma.student.findUnique({ where: { nationalId } });
    if (!student) continue;
    const tuitionPaid = Math.floor(student.tuitionFees * 0.6);
    await prisma.payment.upsert({ where: { receiptNumber: `RCP-${counter}` }, update: {}, create: { studentId: student.id, studentName: student.name, amount: tuitionPaid, type: 'tuition', method: counter % 3 === 0 ? 'cash' : counter % 3 === 1 ? 'bank_transfer' : 'check', date: '2024-10-01', receiptNumber: `RCP-${counter}`, collectedBy: 'محمود إبراهيم نصر', academicYear: year, notes: 'دفعة أولى' } });
    counter++;
    if (student.booksFees > 0) {
      await prisma.payment.upsert({ where: { receiptNumber: `RCP-${counter}` }, update: {}, create: { studentId: student.id, studentName: student.name, amount: student.booksFees, type: 'books', method: 'cash', date: '2024-09-15', receiptNumber: `RCP-${counter}`, collectedBy: 'محمود إبراهيم نصر', academicYear: year } });
      counter++;
    }
    await prisma.student.update({ where: { id: student.id }, data: { paidAmount: tuitionPaid + student.booksFees } });
  }
  for (const nationalId of pendingIds) {
    const student = await prisma.student.findUnique({ where: { nationalId } });
    if (!student) continue;
    await prisma.student.update({ where: { id: student.id }, data: { pendingPaymentAmount: Math.floor(student.tuitionFees * 0.4), pendingPaymentType: 'tuition', pendingPaymentMethod: 'bank_transfer', paymentRequestStatus: 'pending', pendingPaymentNotes: 'طلب سداد دفعة ثانية' } });
  }
  console.log(`✅ تم إضافة مدفوعات لـ ${paidIds.length} طالب و${pendingIds.length} طلب معلق.`);
}

async function seedInstallmentPlans() {
  console.log('📅 جاري إضافة خطط الأقساط...');
  const year = '2024-2025';
  const planStudents = [
    { nationalId: '31001010000005', overdue: false },
    { nationalId: '31001010000010', overdue: false },
    { nationalId: '31002010000043', overdue: false },
    { nationalId: '31002010000045', overdue: false },
    { nationalId: '31002010000053', overdue: false },
    { nationalId: '31002010000055', overdue: false },
    { nationalId: '31002010000063', overdue: false },
    { nationalId: '31002010000065', overdue: false },
    { nationalId: '31002010000073', overdue: false },
    { nationalId: '31002010000075', overdue: false },
    { nationalId: '31003010000083', overdue: false },
    { nationalId: '31003010000085', overdue: false },
    { nationalId: '31003010000093', overdue: true },
    { nationalId: '31003010000095', overdue: true },
    { nationalId: '31003010000103', overdue: true },
    { nationalId: '31003010000105', overdue: true },
    { nationalId: '31004010000113', overdue: true },
    { nationalId: '31004010000115', overdue: true },
    { nationalId: '31004010000123', overdue: true },
    { nationalId: '31004010000125', overdue: true },
    { nationalId: '31004010000133', overdue: true },
    { nationalId: '31004010000135', overdue: true },
    { nationalId: '31006010000301', overdue: false },
    { nationalId: '31006010000303', overdue: false },
    { nationalId: '31006010000305', overdue: true },
  ];
  for (const { nationalId, overdue } of planStudents) {
    const student = await prisma.student.findUnique({ where: { nationalId } });
    if (!student) continue;
    const existing = await prisma.installmentPlan.findUnique({ where: { studentId: student.id } });
    if (existing) continue;
    const remaining = student.totalFees - student.paidAmount;
    if (remaining <= 0) continue;
    const amt = Math.floor(remaining / 4);
    const installments = overdue
      ? [
          { amount: amt, dueDate: '2024-10-15', paidAmount: 0, status: 'pending' },
          { amount: amt, dueDate: '2024-11-15', paidAmount: 0, status: 'pending' },
          { amount: amt, dueDate: '2025-01-15', paidAmount: 0, status: 'pending' },
          { amount: remaining - amt * 3, dueDate: '2025-03-15', paidAmount: 0, status: 'pending' },
        ]
      : [
          { amount: amt, dueDate: '2024-10-15', paidAmount: amt, paidDate: '2024-10-10', status: 'paid' },
          { amount: amt, dueDate: '2024-12-15', paidAmount: 0, status: 'pending' },
          { amount: amt, dueDate: '2025-02-15', paidAmount: 0, status: 'pending' },
          { amount: remaining - amt * 3, dueDate: '2025-04-15', paidAmount: 0, status: 'pending' },
        ];
    await prisma.installmentPlan.create({ data: { studentId: student.id, totalAmount: remaining, academicYear: year, status: 'active', installments: { create: installments } } });
  }
  console.log('✅ تم إضافة خطط الأقساط.');
}

async function seedInventoryTransactions() {
  console.log('🏪 جاري إضافة حركات المخزن...');
  const today = new Date().toISOString().split('T')[0];
  const bookBuyers = ['31002010000021','31002010000022','31002010000024','31002010000026','31002010000031','31002010000032','31002010000034','31003010000081','31003010000082','31003010000084','31003010000091','31003010000092','31003010000094','31003010000101','31003010000102','31003010000104'];
  const uniformBuyers = ['31001010000001','31001010000003','31001010000006','31001010000008','31002010000021','31002010000022','31002010000031','31002010000041','31002010000051','31002010000061','31002010000071','31003010000081','31003010000082','31004010000111','31004010000112','31006010000301','31006010000303'];
  for (const nationalId of bookBuyers) {
    const student = await prisma.student.findUnique({ where: { nationalId } });
    if (!student) continue;
    const itemId = student.stage === 'preparatory' ? 'inv-item-002' : 'inv-item-001';
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) continue;
    await prisma.inventoryTransaction.create({ data: { itemId, type: 'out', subType: 'sale', quantity: 1, unitCostSnapshot: item.unitCost, unitPriceSnapshot: item.unitPrice, totalAmount: item.unitPrice, studentId: student.id, studentName: student.name, performedBy: 'سامي عبدالله حسين', date: '2024-09-20', notes: 'بيع كتاب للطالب' } });
  }
  for (const nationalId of uniformBuyers) {
    const student = await prisma.student.findUnique({ where: { nationalId } });
    if (!student) continue;
    await prisma.inventoryTransaction.create({ data: { itemId: 'inv-item-003', type: 'out', subType: 'sale', quantity: 1, unitCostSnapshot: 250, unitPriceSnapshot: 350, totalAmount: 350, studentId: student.id, studentName: student.name, performedBy: 'سامي عبدالله حسين', date: '2024-09-10', notes: 'بيع زي صيفي للطالب' } });
  }
  await prisma.inventoryTransaction.create({ data: { itemId: 'inv-item-001', type: 'in', subType: 'purchase', quantity: 300, unitCostSnapshot: 100, unitPriceSnapshot: 150, totalAmount: 30000, supplierName: 'دار النشر التعليمية', performedBy: 'سامي عبدالله حسين', date: '2024-09-01', notes: 'شراء مخزون بداية العام' } });
  await prisma.inventoryTransaction.create({ data: { itemId: 'inv-item-003', type: 'in', subType: 'purchase', quantity: 400, unitCostSnapshot: 250, unitPriceSnapshot: 350, totalAmount: 100000, supplierName: 'مصنع الزي المدرسي', performedBy: 'سامي عبدالله حسين', date: '2024-08-25', notes: 'شراء مخزون الزي الصيفي' } });
  console.log('✅ تم إضافة حركات المخزن.');
}

async function main() {
  await seedUsers();
  await seedInventoryItems();
  await seedAdmittedStudents();
  await seedPendingStudents();
  await seedPromotedStudents();
  await seedPayments();
  await seedInstallmentPlans();
  await seedInventoryTransactions();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
