import type { User, Student, Payment, InstallmentPlan, InventoryItem, InventoryTransaction, BusRoute, BusSubscription } from '@/types';

export const mockUsers: User[] = [
  { id: 'u1', name: 'أحمد محمد إبراهيم', email: 'admin@school.com', password: '123456', role: 'system_admin', active: true },
  { id: 'u2', name: 'محمد علي الشريف', email: 'director@school.com', password: '123456', role: 'school_director', active: true },
  { id: 'u3', name: 'سارة أحمد خليل', email: 'head@school.com', password: '123456', role: 'head_accountant', active: true },
  { id: 'u4', name: 'فاطمة حسن عمر', email: 'cashier@school.com', password: '123456', role: 'accountant', active: true },
  { id: 'u5', name: 'خالد عمر سعيد', email: 'warehouse@school.com', password: '123456', role: 'warehouse_keeper', active: true },
  { id: 'u6', name: 'عمر سعيد الفقي', email: 'bus@school.com', password: '123456', role: 'bus_supervisor', active: true },
];

export const mockStudents: Student[] = [
  { id: 's1', nationalId: '30001010112345', name: 'يوسف أحمد إبراهيم', stage: 'kg', grade: 'KG1', className: 'KG1-أ', guardianName: 'أحمد إبراهيم محمود', guardianPhone: '01001234567', address: 'النجيلة', enrollmentDate: '2024-09-01', status: 'active', totalFees: 15000, paidAmount: 15000 },
  { id: 's2', nationalId: '30002020223456', name: 'مريم خالد العتيبي', stage: 'kg', grade: 'KG2', className: 'KG2-ب', guardianName: 'خالد العتيبي سعد', guardianPhone: '01012345678', address: 'صفط العنب', enrollmentDate: '2024-09-01', status: 'active', totalFees: 15000, paidAmount: 10000 },
  { id: 's3', nationalId: '30003030334567', name: 'عمر محمد الشريف', stage: 'primary', grade: 'الأول', className: '1/أ', guardianName: 'محمد الشريف حسن', guardianPhone: '01023456789', address: 'كفر مجاهد', enrollmentDate: '2024-09-01', status: 'active', busRouteId: 'r3', totalFees: 18000, paidAmount: 18000 },
  { id: 's4', nationalId: '30004040445678', name: 'فاطمة علي حسن', stage: 'primary', grade: 'الثاني', className: '2/ب', guardianName: 'علي حسن محمد', guardianPhone: '01034567890', address: 'بدر', enrollmentDate: '2024-09-01', status: 'active', busRouteId: 'r1', totalFees: 18000, paidAmount: 12000 },
  { id: 's5', nationalId: '30005050556789', name: 'أحمد عبدالرحمن السيد', stage: 'primary', grade: 'الثالث', className: '3/أ', guardianName: 'عبدالرحمن السيد أحمد', guardianPhone: '01045678901', address: 'واقد', enrollmentDate: '2024-09-01', status: 'active', totalFees: 18000, paidAmount: 18000 },
  { id: 's6', nationalId: '30006060667890', name: 'نور الدين سعيد', stage: 'primary', grade: 'الرابع', className: '4/أ', guardianName: 'سعيد أحمد نور', guardianPhone: '01056789012', address: 'البريجات', enrollmentDate: '2024-09-01', status: 'active', busRouteId: 'r4', totalFees: 18000, paidAmount: 9000 },
  { id: 's7', nationalId: '30007070778901', name: 'سارة محمود عبدالله', stage: 'primary', grade: 'الخامس', className: '5/ب', guardianName: 'محمود عبدالله فتحي', guardianPhone: '01067890123', address: 'دمشلي', enrollmentDate: '2024-09-01', status: 'active', busRouteId: 'r2', totalFees: 18000, paidAmount: 14000 },
  { id: 's8', nationalId: '30008080889012', name: 'خالد إبراهيم الفقي', stage: 'primary', grade: 'السادس', className: '6/أ', guardianName: 'إبراهيم الفقي عمر', guardianPhone: '01078901234', address: 'علقام', enrollmentDate: '2024-09-01', status: 'active', totalFees: 18000, paidAmount: 18000 },
  { id: 's9', nationalId: '30009090990123', name: 'ليلى عمر أبو زيد', stage: 'preparatory', grade: 'الأول', className: '1 إعدادي/أ', guardianName: 'عمر أبو زيد سالم', guardianPhone: '01089012345', address: 'الطيارية', enrollmentDate: '2024-09-01', status: 'active', busRouteId: 'r5', totalFees: 22000, paidAmount: 22000 },
  { id: 's10', nationalId: '30010101001234', name: 'محمد حسام الدين', stage: 'preparatory', grade: 'الثاني', className: '2 إعدادي/ب', guardianName: 'حسام الدين عبدالعزيز', guardianPhone: '01090123456', address: 'النجاح', enrollmentDate: '2024-09-01', status: 'active', busRouteId: 'r4', totalFees: 22000, paidAmount: 15000 },
  { id: 's11', nationalId: '30011111112345', name: 'هند طارق النجار', stage: 'preparatory', grade: 'الثالث', className: '3 إعدادي/أ', guardianName: 'طارق النجار محمد', guardianPhone: '01101234567', address: 'بغداد', enrollmentDate: '2024-09-01', status: 'active', totalFees: 22000, paidAmount: 22000 },
  { id: 's12', nationalId: '30012121223456', name: 'عبدالله رمضان خليل', stage: 'secondary', grade: 'الأول', className: '1 ثانوي/أ', guardianName: 'رمضان خليل عبدالله', guardianPhone: '01112345678', address: 'عين جالوت', enrollmentDate: '2024-09-01', status: 'active', busRouteId: 'r1', totalFees: 25000, paidAmount: 20000 },
  { id: 's13', nationalId: '30013131334567', name: 'ريم أشرف الصاوي', stage: 'secondary', grade: 'الثاني', className: '2 ثانوي/ب', guardianName: 'أشرف الصاوي حسن', guardianPhone: '01123456789', address: 'احمد عرابي', enrollmentDate: '2024-09-01', status: 'active', busRouteId: 'r2', totalFees: 25000, paidAmount: 25000 },
  { id: 's14', nationalId: '30014141445678', name: 'إبراهيم سمير عطية', stage: 'secondary', grade: 'الثالث', className: '3 ثانوي/أ', guardianName: 'سمير عطية إبراهيم', guardianPhone: '01134567890', address: 'ام صابر', enrollmentDate: '2024-09-01', status: 'active', busRouteId: 'r3', totalFees: 25000, paidAmount: 18000 },
  { id: 's15', nationalId: '30015151556789', name: 'دينا مصطفى كامل', stage: 'kg', grade: 'KG1', className: 'KG1-ب', guardianName: 'مصطفى كامل أحمد', guardianPhone: '01145678901', address: 'كوم حماده', enrollmentDate: '2024-09-01', status: 'active', totalFees: 15000, paidAmount: 7500 },
  { id: 's16', nationalId: '30016161667890', name: 'حسن عادل المنصوري', stage: 'primary', grade: 'الأول', className: '1/ب', guardianName: 'عادل المنصوري حسن', guardianPhone: '01156789012', address: 'ابو الخاوي', enrollmentDate: '2024-09-01', status: 'active', busRouteId: 'r4', totalFees: 18000, paidAmount: 18000 },
  { id: 's17', nationalId: '30017171778901', name: 'ملك وائل البدري', stage: 'primary', grade: 'الثالث', className: '3/ب', guardianName: 'وائل البدري سعيد', guardianPhone: '01167890123', address: 'كفر بولين', enrollmentDate: '2024-09-01', status: 'active', busRouteId: 'r2', totalFees: 18000, paidAmount: 6000 },
  { id: 's18', nationalId: '30018181889012', name: 'طارق جمال رشدي', stage: 'preparatory', grade: 'الأول', className: '1 إعدادي/ب', guardianName: 'جمال رشدي طارق', guardianPhone: '01178901234', address: 'كفر زيادة', enrollmentDate: '2024-09-01', status: 'active', totalFees: 22000, paidAmount: 22000 },
  { id: 's19', nationalId: '30019191990123', name: 'ياسمين صلاح حمدي', stage: 'preparatory', grade: 'الثاني', className: '2 إعدادي/أ', guardianName: 'صلاح حمدي ياسر', guardianPhone: '01189012345', address: 'الحدين', enrollmentDate: '2024-09-01', status: 'active', busRouteId: 'r5', totalFees: 22000, paidAmount: 11000 },
  { id: 's20', nationalId: '30020202001234', name: 'كريم ناصر الغامدي', stage: 'secondary', grade: 'الأول', className: '1 ثانوي/ب', guardianName: 'ناصر الغامدي فهد', guardianPhone: '01190123456', address: 'خنيزة', enrollmentDate: '2024-09-01', status: 'active', busRouteId: 'r4', totalFees: 25000, paidAmount: 25000 },
  { id: 's21', nationalId: '30021212112345', name: 'سلمى هشام زكي', stage: 'secondary', grade: 'الثاني', className: '2 ثانوي/أ', guardianName: 'هشام زكي محمود', guardianPhone: '01201234567', address: 'كوم حمادة', enrollmentDate: '2024-09-01', status: 'active', totalFees: 25000, paidAmount: 19000 },
  { id: 's22', nationalId: '30022222223456', name: 'بلال أنور شعبان', stage: 'primary', grade: 'الرابع', className: '4/ب', guardianName: 'أنور شعبان محمد', guardianPhone: '01212345678', address: 'بدر', enrollmentDate: '2024-09-01', status: 'active', busRouteId: 'r1', totalFees: 18000, paidAmount: 13500 },
  { id: 's23', nationalId: '30023232334567', name: 'جنى عبدالحميد فوزي', stage: 'kg', grade: 'KG2', className: 'KG2-أ', guardianName: 'عبدالحميد فوزي جمال', guardianPhone: '01223456789', address: 'بغداد', enrollmentDate: '2024-09-01', status: 'active', totalFees: 15000, paidAmount: 15000 },
  { id: 's24', nationalId: '30024242445678', name: 'زياد وليد سالم', stage: 'primary', grade: 'الخامس', className: '5/أ', guardianName: 'وليد سالم أحمد', guardianPhone: '01234567890', address: 'بغداد', enrollmentDate: '2024-09-01', status: 'active', busRouteId: 'r3', totalFees: 18000, paidAmount: 9000 },
  { id: 's25', nationalId: '30025252556789', name: 'آية حسين الشافعي', stage: 'secondary', grade: 'الثالث', className: '3 ثانوي/ب', guardianName: 'حسين الشافعي عمر', guardianPhone: '01245678901', address: 'البريجات', enrollmentDate: '2024-09-01', status: 'active', totalFees: 25000, paidAmount: 25000 },
];

export const mockPayments: Payment[] = [
  { id: 'p1', studentId: 's1', studentName: 'يوسف أحمد إبراهيم', amount: 7500, type: 'tuition', method: 'cash', date: '2024-09-05', receiptNumber: 'REC-001', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p2', studentId: 's1', studentName: 'يوسف أحمد إبراهيم', amount: 7500, type: 'tuition', method: 'cash', date: '2024-12-01', receiptNumber: 'REC-002', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p3', studentId: 's2', studentName: 'مريم خالد العتيبي', amount: 5000, type: 'tuition', method: 'bank_transfer', date: '2024-09-10', receiptNumber: 'REC-003', collectedBy: 'سارة أحمد خليل' },
  { id: 'p4', studentId: 's2', studentName: 'مريم خالد العتيبي', amount: 5000, type: 'tuition', method: 'bank_transfer', date: '2024-12-10', receiptNumber: 'REC-004', collectedBy: 'سارة أحمد خليل' },
  { id: 'p5', studentId: 's3', studentName: 'عمر محمد الشريف', amount: 18000, type: 'tuition', method: 'check', date: '2024-09-01', receiptNumber: 'REC-005', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p6', studentId: 's4', studentName: 'فاطمة علي حسن', amount: 6000, type: 'tuition', method: 'cash', date: '2024-09-08', receiptNumber: 'REC-006', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p7', studentId: 's4', studentName: 'فاطمة علي حسن', amount: 6000, type: 'tuition', method: 'cash', date: '2024-12-08', receiptNumber: 'REC-007', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p8', studentId: 's5', studentName: 'أحمد عبدالرحمن السيد', amount: 18000, type: 'tuition', method: 'bank_transfer', date: '2024-09-03', receiptNumber: 'REC-008', collectedBy: 'سارة أحمد خليل' },
  { id: 'p9', studentId: 's6', studentName: 'نور الدين سعيد', amount: 4500, type: 'tuition', method: 'cash', date: '2024-09-15', receiptNumber: 'REC-009', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p10', studentId: 's6', studentName: 'نور الدين سعيد', amount: 4500, type: 'tuition', method: 'cash', date: '2024-12-15', receiptNumber: 'REC-010', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p11', studentId: 's7', studentName: 'سارة محمود عبدالله', amount: 7000, type: 'tuition', method: 'cash', date: '2024-09-12', receiptNumber: 'REC-011', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p12', studentId: 's7', studentName: 'سارة محمود عبدالله', amount: 7000, type: 'tuition', method: 'cash', date: '2025-01-12', receiptNumber: 'REC-012', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p13', studentId: 's8', studentName: 'خالد إبراهيم الفقي', amount: 18000, type: 'tuition', method: 'bank_transfer', date: '2024-09-02', receiptNumber: 'REC-013', collectedBy: 'سارة أحمد خليل' },
  { id: 'p14', studentId: 's9', studentName: 'ليلى عمر أبو زيد', amount: 22000, type: 'tuition', method: 'check', date: '2024-09-01', receiptNumber: 'REC-014', collectedBy: 'سارة أحمد خليل' },
  { id: 'p15', studentId: 's10', studentName: 'محمد حسام الدين', amount: 7500, type: 'tuition', method: 'cash', date: '2024-09-20', receiptNumber: 'REC-015', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p16', studentId: 's10', studentName: 'محمد حسام الدين', amount: 7500, type: 'tuition', method: 'cash', date: '2025-01-20', receiptNumber: 'REC-016', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p17', studentId: 's11', studentName: 'هند طارق النجار', amount: 22000, type: 'tuition', method: 'bank_transfer', date: '2024-09-05', receiptNumber: 'REC-017', collectedBy: 'سارة أحمد خليل' },
  { id: 'p18', studentId: 's12', studentName: 'عبدالله رمضان خليل', amount: 10000, type: 'tuition', method: 'cash', date: '2024-09-10', receiptNumber: 'REC-018', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p19', studentId: 's12', studentName: 'عبدالله رمضان خليل', amount: 10000, type: 'tuition', method: 'cash', date: '2025-01-10', receiptNumber: 'REC-019', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p20', studentId: 's13', studentName: 'ريم أشرف الصاوي', amount: 25000, type: 'tuition', method: 'check', date: '2024-09-01', receiptNumber: 'REC-020', collectedBy: 'سارة أحمد خليل' },
  { id: 'p21', studentId: 's14', studentName: 'إبراهيم سمير عطية', amount: 9000, type: 'tuition', method: 'cash', date: '2024-09-12', receiptNumber: 'REC-021', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p22', studentId: 's14', studentName: 'إبراهيم سمير عطية', amount: 9000, type: 'tuition', method: 'cash', date: '2025-01-12', receiptNumber: 'REC-022', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p23', studentId: 's15', studentName: 'دينا مصطفى كامل', amount: 7500, type: 'tuition', method: 'cash', date: '2024-09-20', receiptNumber: 'REC-023', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p24', studentId: 's3', studentName: 'عمر محمد الشريف', amount: 2500, type: 'books', method: 'cash', date: '2024-09-01', receiptNumber: 'REC-024', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p25', studentId: 's3', studentName: 'عمر محمد الشريف', amount: 1500, type: 'uniform', method: 'cash', date: '2024-09-01', receiptNumber: 'REC-025', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p26', studentId: 's3', studentName: 'عمر محمد الشريف', amount: 3000, type: 'bus', method: 'cash', date: '2024-09-01', receiptNumber: 'REC-026', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p27', studentId: 's16', studentName: 'حسن عادل المنصوري', amount: 18000, type: 'tuition', method: 'bank_transfer', date: '2024-09-05', receiptNumber: 'REC-027', collectedBy: 'سارة أحمد خليل' },
  { id: 'p28', studentId: 's17', studentName: 'ملك وائل البدري', amount: 6000, type: 'tuition', method: 'cash', date: '2024-09-18', receiptNumber: 'REC-028', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p29', studentId: 's18', studentName: 'طارق جمال رشدي', amount: 22000, type: 'tuition', method: 'check', date: '2024-09-02', receiptNumber: 'REC-029', collectedBy: 'سارة أحمد خليل' },
  { id: 'p30', studentId: 's19', studentName: 'ياسمين صلاح حمدي', amount: 11000, type: 'tuition', method: 'cash', date: '2024-09-25', receiptNumber: 'REC-030', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p31', studentId: 's20', studentName: 'كريم ناصر الغامدي', amount: 25000, type: 'tuition', method: 'bank_transfer', date: '2024-09-01', receiptNumber: 'REC-031', collectedBy: 'سارة أحمد خليل' },
  { id: 'p32', studentId: 's21', studentName: 'سلمى هشام زكي', amount: 9500, type: 'tuition', method: 'cash', date: '2024-09-14', receiptNumber: 'REC-032', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p33', studentId: 's21', studentName: 'سلمى هشام زكي', amount: 9500, type: 'tuition', method: 'cash', date: '2025-01-14', receiptNumber: 'REC-033', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p34', studentId: 's22', studentName: 'بلال أنور شعبان', amount: 6750, type: 'tuition', method: 'cash', date: '2024-09-22', receiptNumber: 'REC-034', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p35', studentId: 's22', studentName: 'بلال أنور شعبان', amount: 6750, type: 'tuition', method: 'cash', date: '2025-01-22', receiptNumber: 'REC-035', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p36', studentId: 's23', studentName: 'جنى عبدالحميد فوزي', amount: 15000, type: 'tuition', method: 'bank_transfer', date: '2024-09-03', receiptNumber: 'REC-036', collectedBy: 'سارة أحمد خليل' },
  { id: 'p37', studentId: 's24', studentName: 'زياد وليد سالم', amount: 4500, type: 'tuition', method: 'cash', date: '2024-09-28', receiptNumber: 'REC-037', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p38', studentId: 's24', studentName: 'زياد وليد سالم', amount: 4500, type: 'tuition', method: 'cash', date: '2025-01-28', receiptNumber: 'REC-038', collectedBy: 'فاطمة حسن عمر' },
  { id: 'p39', studentId: 's25', studentName: 'آية حسين الشافعي', amount: 25000, type: 'tuition', method: 'check', date: '2024-09-01', receiptNumber: 'REC-039', collectedBy: 'سارة أحمد خليل' },
  { id: 'p40', studentId: 's1', studentName: 'يوسف أحمد إبراهيم', amount: 2000, type: 'books', method: 'cash', date: '2024-09-05', receiptNumber: 'REC-040', collectedBy: 'فاطمة حسن عمر' },
];

export const mockInstallments: InstallmentPlan[] = [
  {
    id: 'ip1', studentId: 's4', studentName: 'فاطمة علي حسن', totalAmount: 18000, numberOfInstallments: 3, createdDate: '2024-09-01',
    installments: [
      { id: 'ii1', dueDate: '2024-09-08', amount: 6000, status: 'paid', paidDate: '2024-09-08' },
      { id: 'ii2', dueDate: '2024-12-08', amount: 6000, status: 'paid', paidDate: '2024-12-08' },
      { id: 'ii3', dueDate: '2025-03-08', amount: 6000, status: 'pending' },
    ]
  },
  {
    id: 'ip2', studentId: 's6', studentName: 'نور الدين سعيد', totalAmount: 18000, numberOfInstallments: 4, createdDate: '2024-09-01',
    installments: [
      { id: 'ii4', dueDate: '2024-09-15', amount: 4500, status: 'paid', paidDate: '2024-09-15' },
      { id: 'ii5', dueDate: '2024-12-15', amount: 4500, status: 'paid', paidDate: '2024-12-15' },
      { id: 'ii6', dueDate: '2025-03-15', amount: 4500, status: 'pending' },
      { id: 'ii7', dueDate: '2025-06-15', amount: 4500, status: 'pending' },
    ]
  },
  {
    id: 'ip3', studentId: 's10', studentName: 'محمد حسام الدين', totalAmount: 22000, numberOfInstallments: 3, createdDate: '2024-09-01',
    installments: [
      { id: 'ii8', dueDate: '2024-09-20', amount: 7500, status: 'paid', paidDate: '2024-09-20' },
      { id: 'ii9', dueDate: '2025-01-20', amount: 7500, status: 'paid', paidDate: '2025-01-20' },
      { id: 'ii10', dueDate: '2025-05-20', amount: 7000, status: 'overdue' },
    ]
  },
  {
    id: 'ip4', studentId: 's17', studentName: 'ملك وائل البدري', totalAmount: 18000, numberOfInstallments: 3, createdDate: '2024-09-01',
    installments: [
      { id: 'ii11', dueDate: '2024-09-18', amount: 6000, status: 'paid', paidDate: '2024-09-18' },
      { id: 'ii12', dueDate: '2025-01-18', amount: 6000, status: 'overdue' },
      { id: 'ii13', dueDate: '2025-05-18', amount: 6000, status: 'pending' },
    ]
  },
  {
    id: 'ip5', studentId: 's19', studentName: 'ياسمين صلاح حمدي', totalAmount: 22000, numberOfInstallments: 2, createdDate: '2024-09-01',
    installments: [
      { id: 'ii14', dueDate: '2024-09-25', amount: 11000, status: 'paid', paidDate: '2024-09-25' },
      { id: 'ii15', dueDate: '2025-03-25', amount: 11000, status: 'pending' },
    ]
  },
  {
    id: 'ip6', studentId: 's14', studentName: 'إبراهيم سمير عطية', totalAmount: 25000, numberOfInstallments: 3, createdDate: '2024-09-01',
    installments: [
      { id: 'ii16', dueDate: '2024-09-12', amount: 9000, status: 'paid', paidDate: '2024-09-12' },
      { id: 'ii17', dueDate: '2025-01-12', amount: 9000, status: 'paid', paidDate: '2025-01-12' },
      { id: 'ii18', dueDate: '2025-05-12', amount: 7000, status: 'pending' },
    ]
  },
];

export const mockInventory: InventoryItem[] = [
  { id: 'inv1', name: 'كتاب اللغة العربية - KG1', category: 'books', quantity: 45, minQuantity: 10, unitPrice: 120, grade: 'KG1', lastUpdated: '2024-08-20' },
  { id: 'inv2', name: 'كتاب اللغة العربية - KG2', category: 'books', quantity: 38, minQuantity: 10, unitPrice: 120, grade: 'KG2', lastUpdated: '2024-08-20' },
  { id: 'inv3', name: 'كتاب الرياضيات - الأول الابتدائي', category: 'books', quantity: 52, minQuantity: 15, unitPrice: 150, grade: 'الأول', lastUpdated: '2024-08-20' },
  { id: 'inv4', name: 'كتاب العلوم - الأول الابتدائي', category: 'books', quantity: 48, minQuantity: 15, unitPrice: 140, grade: 'الأول', lastUpdated: '2024-08-20' },
  { id: 'inv5', name: 'كتاب اللغة الإنجليزية - الثاني الابتدائي', category: 'books', quantity: 30, minQuantity: 15, unitPrice: 160, grade: 'الثاني', lastUpdated: '2024-08-20' },
  { id: 'inv6', name: 'كتاب الرياضيات - الثالث الابتدائي', category: 'books', quantity: 8, minQuantity: 15, unitPrice: 155, grade: 'الثالث', lastUpdated: '2024-08-25' },
  { id: 'inv7', name: 'كتاب العلوم - الأول الإعدادي', category: 'books', quantity: 35, minQuantity: 10, unitPrice: 180, grade: '1 إعدادي', lastUpdated: '2024-08-20' },
  { id: 'inv8', name: 'كتاب الفيزياء - الأول الثانوي', category: 'books', quantity: 25, minQuantity: 10, unitPrice: 200, grade: '1 ثانوي', lastUpdated: '2024-08-20' },
  { id: 'inv9', name: 'زي صيفي - مقاس صغير', category: 'uniform', quantity: 60, minQuantity: 20, unitPrice: 350, lastUpdated: '2024-08-15' },
  { id: 'inv10', name: 'زي صيفي - مقاس متوسط', category: 'uniform', quantity: 45, minQuantity: 20, unitPrice: 380, lastUpdated: '2024-08-15' },
  { id: 'inv11', name: 'زي صيفي - مقاس كبير', category: 'uniform', quantity: 35, minQuantity: 15, unitPrice: 400, lastUpdated: '2024-08-15' },
  { id: 'inv12', name: 'زي شتوي - مقاس صغير', category: 'uniform', quantity: 50, minQuantity: 20, unitPrice: 450, lastUpdated: '2024-08-15' },
  { id: 'inv13', name: 'زي شتوي - مقاس متوسط', category: 'uniform', quantity: 12, minQuantity: 20, unitPrice: 480, lastUpdated: '2024-08-15' },
  { id: 'inv14', name: 'زي شتوي - مقاس كبير', category: 'uniform', quantity: 28, minQuantity: 15, unitPrice: 500, lastUpdated: '2024-08-15' },
  { id: 'inv15', name: 'حذاء مدرسي - مقاس 30-35', category: 'uniform', quantity: 40, minQuantity: 15, unitPrice: 250, lastUpdated: '2024-08-15' },
  { id: 'inv16', name: 'أقلام رصاص (علبة 12)', category: 'tools', quantity: 200, minQuantity: 50, unitPrice: 30, lastUpdated: '2024-08-25' },
  { id: 'inv17', name: 'كراسات A4 (ربطة 10)', category: 'tools', quantity: 150, minQuantity: 40, unitPrice: 45, lastUpdated: '2024-08-25' },
  { id: 'inv18', name: 'ألوان خشبية (علبة 24)', category: 'tools', quantity: 80, minQuantity: 30, unitPrice: 65, lastUpdated: '2024-08-25' },
  { id: 'inv19', name: 'مسطرة 30 سم', category: 'tools', quantity: 120, minQuantity: 30, unitPrice: 15, lastUpdated: '2024-08-25' },
  { id: 'inv20', name: 'ممحاة (علبة 20)', category: 'tools', quantity: 90, minQuantity: 25, unitPrice: 40, lastUpdated: '2024-08-25' },
  { id: 'inv21', name: 'مجهر معملي', category: 'lab_equipment', quantity: 15, minQuantity: 5, unitPrice: 2500, lastUpdated: '2024-08-10' },
  { id: 'inv22', name: 'أنابيب اختبار (علبة 50)', category: 'lab_equipment', quantity: 20, minQuantity: 5, unitPrice: 350, lastUpdated: '2024-08-10' },
  { id: 'inv23', name: 'موقد بنزن', category: 'lab_equipment', quantity: 10, minQuantity: 3, unitPrice: 800, lastUpdated: '2024-08-10' },
  { id: 'inv24', name: 'نظارات واقية (علبة 10)', category: 'lab_equipment', quantity: 8, minQuantity: 5, unitPrice: 450, lastUpdated: '2024-08-10' },
  { id: 'inv25', name: 'ورق تصوير A4 (رزمة 500)', category: 'operational', quantity: 100, minQuantity: 30, unitPrice: 180, lastUpdated: '2024-09-01' },
  { id: 'inv26', name: 'حبر طابعة أسود', category: 'operational', quantity: 15, minQuantity: 5, unitPrice: 650, lastUpdated: '2024-09-01' },
  { id: 'inv27', name: 'حبر طابعة ألوان', category: 'operational', quantity: 8, minQuantity: 3, unitPrice: 850, lastUpdated: '2024-09-01' },
  { id: 'inv28', name: 'طباشير أبيض (علبة 100)', category: 'operational', quantity: 50, minQuantity: 15, unitPrice: 35, lastUpdated: '2024-09-01' },
  { id: 'inv29', name: 'أقلام سبورة (علبة 12)', category: 'operational', quantity: 40, minQuantity: 10, unitPrice: 120, lastUpdated: '2024-09-01' },
  { id: 'inv30', name: 'ملفات بلاستيك A4 (علبة 50)', category: 'operational', quantity: 25, minQuantity: 10, unitPrice: 200, lastUpdated: '2024-09-01' },
];

export const mockInventoryTransactions: InventoryTransaction[] = [
  { id: 'it1', itemId: 'inv1', itemName: 'كتاب اللغة العربية - KG1', type: 'in', quantity: 50, date: '2024-08-20', notes: 'توريد أول العام', performedBy: 'خالد عمر سعيد' },
  { id: 'it2', itemId: 'inv1', itemName: 'كتاب اللغة العربية - KG1', type: 'out', quantity: 5, date: '2024-09-05', studentId: 's1', studentName: 'يوسف أحمد إبراهيم', performedBy: 'خالد عمر سعيد' },
  { id: 'it3', itemId: 'inv9', itemName: 'زي صيفي - مقاس صغير', type: 'in', quantity: 80, date: '2024-08-15', notes: 'توريد الزي الصيفي', performedBy: 'خالد عمر سعيد' },
  { id: 'it4', itemId: 'inv9', itemName: 'زي صيفي - مقاس صغير', type: 'out', quantity: 20, date: '2024-09-01', notes: 'توزيع على طلاب KG', performedBy: 'خالد عمر سعيد' },
  { id: 'it5', itemId: 'inv25', itemName: 'ورق تصوير A4 (رزمة 500)', type: 'in', quantity: 120, date: '2024-09-01', notes: 'توريد ورق', performedBy: 'خالد عمر سعيد' },
  { id: 'it6', itemId: 'inv25', itemName: 'ورق تصوير A4 (رزمة 500)', type: 'out', quantity: 20, date: '2024-10-01', notes: 'صرف للمكاتب', performedBy: 'خالد عمر سعيد' },
];

export const mockBusRoutes: BusRoute[] = [
  { id: 'r1', name: 'خط كوم حمادة', driverName: 'حسن محمد عبدالله', driverPhone: '01551234567', busNumber: 'ق م ن 1234', capacity: 40, monthlyFee: 500, annualFee: 5000, stops: ['كوم حمادة المدينة', 'النجيلة', 'شبراخيت', 'صفط العنب', 'كفر مجاهد'] },
  { id: 'r2', name: 'خط مركز بدر', driverName: 'محمود سعيد أحمد', driverPhone: '01552345678', busNumber: 'ق م ن 5678', capacity: 35, monthlyFee: 450, annualFee: 4500, stops: ['واقد', 'البريجات', 'دمشلي', 'علقام', 'الطيرية'] 
  },
  { id: 'r3', name: 'خط دمنهور', driverName: 'أحمد فتحي رمضان', driverPhone: '01553456789', busNumber: 'ق م ن 9012', capacity: 45, monthlyFee: 600, annualFee: 6000, stops:['مدينة بدر', 'النجاح', 'بغداد', 'عين جالوت', 'صلاح الدين'] },
  { id: 'r4', name: 'خط الدلنجات', driverName: 'عبدالرحمن خالد', driverPhone: '01554567890', busNumber: 'ق م ن 3456', capacity: 40, monthlyFee: 550, annualFee: 5500, stops: ['أحمد عرابي', 'المنطقة الصناعية', 'عمر مكرم', 'عبدالسلام عارف', 'أم صابر'] },
  { id: 'r5', name: 'خط الاسكندرية', driverName: 'سامي إبراهيم نور', driverPhone: '01555678901', busNumber: 'ق م ن 7890', capacity: 30, monthlyFee: 400, annualFee: 4000, stops: ['خنيزة', 'منشأة بولين', 'كفر زيادة', 'الحدين'] },
];

export const mockBusSubscriptions: BusSubscription[] = [
  { id: 'bs1', studentId: 's3', studentName: 'عمر محمد الشريف', routeId: 'r3', routeName: 'خط كوم حمادة', type: 'annual', startDate: '2024-09-01', endDate: '2025-06-30', status: 'active' },
  { id: 'bs2', studentId: 's4', studentName: 'فاطمة علي حسن', routeId: 'r1', routeName: 'خط مركز بدر', type: 'annual', startDate: '2024-09-01', endDate: '2025-06-30', status: 'active' },
  { id: 'bs3', studentId: 's6', studentName: 'نور الدين سعيد', routeId: 'r4', routeName: 'خط كوم حمادة', type: 'annual', startDate: '2024-09-01', endDate: '2025-06-30', status: 'active' },
  { id: 'bs4', studentId: 's7', studentName: 'سارة محمود عبدالله', routeId: 'r2', routeName: 'خط دمنهور', type: 'monthly', startDate: '2025-01-01', endDate: '2025-01-31', status: 'active' },
  { id: 'bs5', studentId: 's9', studentName: 'ليلى عمر أبو زيد', routeId: 'r5', routeName: 'خط الاسكندرية', type: 'annual', startDate: '2024-09-01', endDate: '2025-06-30', status: 'active' },
  { id: 'bs6', studentId: 's10', studentName: 'محمد حسام الدين', routeId: 'r4', routeName: 'خط ابوحمص', type: 'annual', startDate: '2024-09-01', endDate: '2025-06-30', status: 'active' },
  { id: 'bs7', studentId: 's12', studentName: 'عبدالله رمضان خليل', routeId: 'r1', routeName: 'خط الدلنجات', type: 'annual', startDate: '2024-09-01', endDate: '2025-06-30', status: 'active' },
  { id: 'bs8', studentId: 's13', studentName: 'ريم أشرف الصاوي', routeId: 'r2', routeName: 'خط كوم حمادة', type: 'annual', startDate: '2024-09-01', endDate: '2025-06-30', status: 'active' },
  { id: 'bs9', studentId: 's14', studentName: 'إبراهيم سمير عطية', routeId: 'r3', routeName: 'خط مركز بدر', type: 'annual', startDate: '2024-09-01', endDate: '2025-06-30', status: 'active' },
  { id: 'bs10', studentId: 's16', studentName: 'حسن عادل المنصوري', routeId: 'r4', routeName: 'خط رشيد', type: 'annual', startDate: '2024-09-01', endDate: '2025-06-30', status: 'active' },
  { id: 'bs11', studentId: 's17', studentName: 'ملك وائل البدري', routeId: 'r2', routeName: 'خط دمنهور', type: 'annual', startDate: '2024-09-01', endDate: '2025-06-30', status: 'active' },
  { id: 'bs12', studentId: 's19', studentName: 'ياسمين صلاح حمدي', routeId: 'r5', routeName: 'خط ابوحمص', type: 'monthly', startDate: '2025-01-01', endDate: '2025-01-31', status: 'active' },
  { id: 'bs13', studentId: 's20', studentName: 'كريم ناصر الغامدي', routeId: 'r4', routeName: 'خط الدلنجات ٢', type: 'annual', startDate: '2024-09-01', endDate: '2025-06-30', status: 'active' },
  { id: 'bs14', studentId: 's22', studentName: 'بلال أنور شعبان', routeId: 'r1', routeName: 'خط دمنهور ٢', type: 'annual', startDate: '2024-09-01', endDate: '2025-06-30', status: 'active' },
  { id: 'bs15', studentId: 's24', studentName: 'زياد وليد سالم', routeId: 'r3', routeName: 'خط مركز بدر', type: 'annual', startDate: '2024-09-01', endDate: '2025-06-30', status: 'active' },
];
