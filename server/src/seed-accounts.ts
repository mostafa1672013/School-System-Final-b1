import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const accounts = [
  // Level 1 - Groups
  { code: '1', name: 'الأصول', nameEn: 'Assets', type: 'asset', level: 1, normalBalance: 'debit' },
  { code: '2', name: 'الالتزامات', nameEn: 'Liabilities', type: 'liability', level: 1, normalBalance: 'credit' },
  { code: '3', name: 'حقوق الملكية', nameEn: 'Equity', type: 'equity', level: 1, normalBalance: 'credit' },
  { code: '4', name: 'الإيرادات', nameEn: 'Revenue', type: 'revenue', level: 1, normalBalance: 'credit' },
  { code: '5', name: 'المصروفات', nameEn: 'Expenses', type: 'expense', level: 1, normalBalance: 'debit' },

  // Level 2 - Main Categories
  { code: '11', name: 'أصول متداولة', nameEn: 'Current Assets', type: 'asset', level: 2, normalBalance: 'debit', parentCode: '1' },
  { code: '12', name: 'المدينون', nameEn: 'Receivables', type: 'asset', level: 2, normalBalance: 'debit', parentCode: '1' },
  { code: '13', name: 'المخزون', nameEn: 'Inventory', type: 'asset', level: 2, normalBalance: 'debit', parentCode: '1' },
  { code: '14', name: 'مصروفات مدفوعة مقدماً', nameEn: 'Prepaid Expenses', type: 'asset', level: 2, normalBalance: 'debit', parentCode: '1' },
  { code: '15', name: 'أصول ثابتة', nameEn: 'Fixed Assets', type: 'asset', level: 2, normalBalance: 'debit', parentCode: '1' },
  { code: '16', name: 'مجمع الإهلاك', nameEn: 'Accumulated Depreciation', type: 'asset', level: 2, normalBalance: 'credit', parentCode: '1' },
  { code: '21', name: 'دائنون تجاريون', nameEn: 'Trade Payables', type: 'liability', level: 2, normalBalance: 'credit', parentCode: '2' },
  { code: '22', name: 'رواتب ومستحقات', nameEn: 'Salaries Payable', type: 'liability', level: 2, normalBalance: 'credit', parentCode: '2' },
  { code: '23', name: 'إيرادات مقبوضة مقدماً', nameEn: 'Deferred Revenue', type: 'liability', level: 2, normalBalance: 'credit', parentCode: '2' },
  { code: '24', name: 'قروض قصيرة الأجل', nameEn: 'Short-term Loans', type: 'liability', level: 2, normalBalance: 'credit', parentCode: '2' },
  { code: '25', name: 'قروض طويلة الأجل', nameEn: 'Long-term Loans', type: 'liability', level: 2, normalBalance: 'credit', parentCode: '2' },
  { code: '31', name: 'رأس المال', nameEn: 'Capital', type: 'equity', level: 2, normalBalance: 'credit', parentCode: '3' },
  { code: '32', name: 'الاحتياطيات', nameEn: 'Reserves', type: 'equity', level: 2, normalBalance: 'credit', parentCode: '3' },
  { code: '33', name: 'أرباح/خسائر مرحلة', nameEn: 'Retained Earnings', type: 'equity', level: 2, normalBalance: 'credit', parentCode: '3' },
  { code: '39', name: 'أرباح/خسائر العام الجاري', nameEn: 'Current Year P&L', type: 'equity', level: 2, normalBalance: 'credit', parentCode: '3' },
  { code: '41', name: 'إيرادات تعليمية', nameEn: 'Educational Revenue', type: 'revenue', level: 2, normalBalance: 'credit', parentCode: '4' },
  { code: '42', name: 'إيرادات المبيعات', nameEn: 'Sales Revenue', type: 'revenue', level: 2, normalBalance: 'credit', parentCode: '4' },
  { code: '43', name: 'إيرادات أخرى', nameEn: 'Other Revenue', type: 'revenue', level: 2, normalBalance: 'credit', parentCode: '4' },
  { code: '51', name: 'تكلفة البضاعة المباعة', nameEn: 'COGS', type: 'expense', level: 2, normalBalance: 'debit', parentCode: '5' },
  { code: '52', name: 'رواتب وميزات الموظفين', nameEn: 'Staff Salaries', type: 'expense', level: 2, normalBalance: 'debit', parentCode: '5' },
  { code: '53', name: 'مصروفات إدارية', nameEn: 'Admin Expenses', type: 'expense', level: 2, normalBalance: 'debit', parentCode: '5' },
  { code: '54', name: 'مصروفات نقل', nameEn: 'Transport Expenses', type: 'expense', level: 2, normalBalance: 'debit', parentCode: '5' },
  { code: '55', name: 'مصروفات تعليمية', nameEn: 'Educational Expenses', type: 'expense', level: 2, normalBalance: 'debit', parentCode: '5' },
  { code: '56', name: 'مصروفات تسويقية', nameEn: 'Marketing Expenses', type: 'expense', level: 2, normalBalance: 'debit', parentCode: '5' },
  { code: '57', name: 'مصروفات مالية', nameEn: 'Financial Expenses', type: 'expense', level: 2, normalBalance: 'debit', parentCode: '5' },
  { code: '58', name: 'إهلاكات', nameEn: 'Depreciation', type: 'expense', level: 2, normalBalance: 'debit', parentCode: '5' },
  { code: '59', name: 'مصروفات متنوعة', nameEn: 'Miscellaneous Expenses', type: 'expense', level: 2, normalBalance: 'debit', parentCode: '5' },

  // Level 3 - Sub-categories
  { code: '1100', name: 'النقدية والبنوك', nameEn: 'Cash and Banks', type: 'asset', level: 3, normalBalance: 'debit', parentCode: '11' },
  { code: '1200', name: 'المدينون', nameEn: 'Receivables', type: 'asset', level: 3, normalBalance: 'debit', parentCode: '12' },
  { code: '1300', name: 'المخزون', nameEn: 'Inventory', type: 'asset', level: 3, normalBalance: 'debit', parentCode: '13' },
  { code: '1400', name: 'مصروفات مدفوعة مقدماً', nameEn: 'Prepaid', type: 'asset', level: 3, normalBalance: 'debit', parentCode: '14' },
  { code: '1500', name: 'أصول ثابتة', nameEn: 'Fixed Assets', type: 'asset', level: 3, normalBalance: 'debit', parentCode: '15' },
  { code: '1600', name: 'مجمع الإهلاك', nameEn: 'Accum. Depreciation', type: 'asset', level: 3, normalBalance: 'credit', parentCode: '16' },
  { code: '2100', name: 'دائنون تجاريون', nameEn: 'Trade Payables', type: 'liability', level: 3, normalBalance: 'credit', parentCode: '21' },
  { code: '2200', name: 'رواتب مستحقة', nameEn: 'Accrued Salaries', type: 'liability', level: 3, normalBalance: 'credit', parentCode: '22' },
  { code: '2300', name: 'إيرادات مقدمة', nameEn: 'Deferred Revenue', type: 'liability', level: 3, normalBalance: 'credit', parentCode: '23' },
  { code: '3100', name: 'رأس المال', nameEn: 'Capital', type: 'equity', level: 3, normalBalance: 'credit', parentCode: '31' },
  { code: '3200', name: 'الاحتياطيات', nameEn: 'Reserves', type: 'equity', level: 3, normalBalance: 'credit', parentCode: '32' },
  { code: '4100', name: 'رسوم دراسية', nameEn: 'Tuition Fees', type: 'revenue', level: 3, normalBalance: 'credit', parentCode: '41' },
  { code: '4200', name: 'مبيعات مخزون', nameEn: 'Inventory Sales', type: 'revenue', level: 3, normalBalance: 'credit', parentCode: '42' },
  { code: '4300', name: 'إيرادات أخرى', nameEn: 'Other Revenue', type: 'revenue', level: 3, normalBalance: 'credit', parentCode: '43' },
  { code: '5100', name: 'تكلفة المبيعات', nameEn: 'Cost of Sales', type: 'expense', level: 3, normalBalance: 'debit', parentCode: '51' },
  { code: '5200', name: 'رواتب الموظفين', nameEn: 'Employee Salaries', type: 'expense', level: 3, normalBalance: 'debit', parentCode: '52' },
  { code: '5300', name: 'مصروفات إدارية', nameEn: 'Admin Expenses', type: 'expense', level: 3, normalBalance: 'debit', parentCode: '53' },
  { code: '5400', name: 'مصروفات النقل', nameEn: 'Transport', type: 'expense', level: 3, normalBalance: 'debit', parentCode: '54' },
  { code: '5500', name: 'مصروفات تعليمية', nameEn: 'Education', type: 'expense', level: 3, normalBalance: 'debit', parentCode: '55' },
  { code: '5800', name: 'الإهلاك', nameEn: 'Depreciation', type: 'expense', level: 3, normalBalance: 'debit', parentCode: '58' },
  { code: '5900', name: 'مصروفات متنوعة', nameEn: 'Misc', type: 'expense', level: 3, normalBalance: 'debit', parentCode: '59' },

  // Level 4 - Detail accounts
  { code: '111001', name: 'الخزينة الرئيسية', nameEn: 'Main Cash', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1100', isSystemAccount: true },
  { code: '111002', name: 'البنك الأهلي - حساب جاري', nameEn: 'Bank - Current Account', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1100', isSystemAccount: true },
  { code: '111003', name: 'البنك الأهلي - حساب توفير', nameEn: 'Bank - Savings Account', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1100', isSystemAccount: true },
  { code: '112001', name: 'مديونية الطلاب (رسوم مستحقة)', nameEn: 'Student Receivables', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1200', isSystemAccount: true },
  { code: '112002', name: 'مديونية موظفين (سلف)', nameEn: 'Employee Advances', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1200' },
  { code: '113001', name: 'مخزون الكتب', nameEn: 'Books Inventory', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1300', isSystemAccount: true },
  { code: '113002', name: 'مخزون الزي المدرسي', nameEn: 'Uniform Inventory', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1300', isSystemAccount: true },
  { code: '113003', name: 'مخزون الأدوات المكتبية', nameEn: 'Office Supplies Inventory', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1300', isSystemAccount: true },
  { code: '113004', name: 'مخزون مستلزمات المعامل', nameEn: 'Lab Supplies Inventory', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1300', isSystemAccount: true },
  { code: '114001', name: 'إيجار مدفوع مقدماً', nameEn: 'Prepaid Rent', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1400' },
  { code: '114002', name: 'تأمينات مدفوعة مقدماً', nameEn: 'Prepaid Insurance', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1400' },
  { code: '115001', name: 'الأراضي', nameEn: 'Land', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1500' },
  { code: '115002', name: 'المباني', nameEn: 'Buildings', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1500' },
  { code: '115003', name: 'أثاث وتجهيزات', nameEn: 'Furniture', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1500' },
  { code: '115004', name: 'أجهزة كمبيوتر', nameEn: 'Computers', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1500' },
  { code: '115005', name: 'الحافلات (مركبات)', nameEn: 'Buses (Vehicles)', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1500' },
  { code: '116001', name: 'مجمع إهلاك المباني', nameEn: 'Accum. Dep. Buildings', type: 'asset', level: 4, normalBalance: 'credit', parentCode: '1600', isSystemAccount: true },
  { code: '116002', name: 'مجمع إهلاك الأثاث', nameEn: 'Accum. Dep. Furniture', type: 'asset', level: 4, normalBalance: 'credit', parentCode: '1600', isSystemAccount: true },
  { code: '116003', name: 'مجمع إهلاك الأجهزة', nameEn: 'Accum. Dep. Equipment', type: 'asset', level: 4, normalBalance: 'credit', parentCode: '1600', isSystemAccount: true },
  { code: '116004', name: 'مجمع إهلاك الحافلات', nameEn: 'Accum. Dep. Buses', type: 'asset', level: 4, normalBalance: 'credit', parentCode: '1600', isSystemAccount: true },
  { code: '121001', name: 'دائنو الموردين (مشتريات)', nameEn: 'Suppliers Payable', type: 'liability', level: 4, normalBalance: 'credit', parentCode: '2100' },
  { code: '121002', name: 'دائنو الحافلات (إيجار شهري)', nameEn: 'Bus Rental Payable', type: 'liability', level: 4, normalBalance: 'credit', parentCode: '2100' },
  { code: '122001', name: 'رواتب مستحقة الدفع', nameEn: 'Accrued Salaries', type: 'liability', level: 4, normalBalance: 'credit', parentCode: '2200', isSystemAccount: true },
  { code: '122002', name: 'تأمينات اجتماعية مستحقة', nameEn: 'Social Insurance Payable', type: 'liability', level: 4, normalBalance: 'credit', parentCode: '2200', isSystemAccount: true },
  { code: '122003', name: 'ضرائب على الرواتب مستحقة', nameEn: 'Payroll Tax Payable', type: 'liability', level: 4, normalBalance: 'credit', parentCode: '2200', isSystemAccount: true },
  { code: '123001', name: 'رسوم دراسية مقبوضة مقدماً', nameEn: 'Deferred Tuition Fees', type: 'liability', level: 4, normalBalance: 'credit', parentCode: '2300', isSystemAccount: true },
  { code: '131001', name: 'رأس المال المدفوع', nameEn: 'Paid-in Capital', type: 'equity', level: 4, normalBalance: 'credit', parentCode: '3100', isSystemAccount: true },
  { code: '132001', name: 'احتياطي قانوني', nameEn: 'Legal Reserve', type: 'equity', level: 4, normalBalance: 'credit', parentCode: '3200' },
  { code: '141001', name: 'رسوم دراسية - المرحلة الابتدائية', nameEn: 'Tuition - Primary', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4100', isSystemAccount: true },
  { code: '141002', name: 'رسوم دراسية - المرحلة الإعدادية', nameEn: 'Tuition - Preparatory', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4100', isSystemAccount: true },
  { code: '141003', name: 'رسوم دراسية - المرحلة الثانوية', nameEn: 'Tuition - Secondary', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4100', isSystemAccount: true },
  { code: '141004', name: 'رسوم التحاق (طلبات)', nameEn: 'Application Fees', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4100', isSystemAccount: true },
  { code: '141005', name: 'رسوم شهادات', nameEn: 'Certificate Fees', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4100' },
  { code: '141006', name: 'رسوم أنشطة', nameEn: 'Activity Fees', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4100' },
  { code: '142001', name: 'مبيعات كتب', nameEn: 'Book Sales', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4200', isSystemAccount: true },
  { code: '142002', name: 'مبيعات زي مدرسي', nameEn: 'Uniform Sales', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4200', isSystemAccount: true },
  { code: '142003', name: 'مبيعات أدوات مكتبية', nameEn: 'Office Supplies Sales', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4200', isSystemAccount: true },
  { code: '143001', name: 'إيرادات نقل (اشتراكات الطلاب)', nameEn: 'Bus Subscription Revenue', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4300', isSystemAccount: true },
  { code: '143002', name: 'إيرادات أخرى', nameEn: 'Other Income', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4300' },
  { code: '143003', name: 'إيرادات فوائد بنكية', nameEn: 'Bank Interest Income', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4300' },
  { code: '151001', name: 'تكلفة كتب مباعة', nameEn: 'Cost of Books Sold', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5100', isSystemAccount: true },
  { code: '151002', name: 'تكلفة زي مدرسي مباع', nameEn: 'Cost of Uniform Sold', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5100', isSystemAccount: true },
  { code: '151003', name: 'تكلفة أدوات مكتبية مباعة', nameEn: 'Cost of Office Supplies Sold', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5100', isSystemAccount: true },
  { code: '152001', name: 'رواتب أساسية - المدرسون', nameEn: 'Basic Salaries - Teachers', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5200', isSystemAccount: true },
  { code: '152002', name: 'رواتب أساسية - الإداريون', nameEn: 'Basic Salaries - Admin', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5200', isSystemAccount: true },
  { code: '152003', name: 'رواتب أساسية - الخدمات', nameEn: 'Basic Salaries - Services', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5200' },
  { code: '152004', name: 'بدلات', nameEn: 'Allowances', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5200' },
  { code: '152005', name: 'حوافز', nameEn: 'Bonuses', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5200' },
  { code: '152006', name: 'تأمينات اجتماعية (حصة المدرسة)', nameEn: 'Social Insurance (Employer)', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5200', isSystemAccount: true },
  { code: '152007', name: 'تأمين صحي', nameEn: 'Health Insurance', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5200' },
  { code: '153001', name: 'إيجار المبنى', nameEn: 'Building Rent', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5300' },
  { code: '153002', name: 'كهرباء ومياه', nameEn: 'Utilities', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5300' },
  { code: '153003', name: 'صيانة وإصلاحات', nameEn: 'Maintenance', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5300' },
  { code: '153004', name: 'نظافة وأمن', nameEn: 'Cleaning & Security', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5300' },
  { code: '153005', name: 'اتصالات وإنترنت', nameEn: 'Telecom & Internet', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5300' },
  { code: '153006', name: 'مطبوعات وقرطاسية', nameEn: 'Printing & Stationery', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5300', isSystemAccount: true },
  { code: '153007', name: 'ضيافة', nameEn: 'Hospitality', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5300' },
  { code: '154001', name: 'إيجار حافلات شهري', nameEn: 'Bus Rental Monthly', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5400', isSystemAccount: true },
  { code: '154002', name: 'صيانة حافلات', nameEn: 'Bus Maintenance', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5400' },
  { code: '154003', name: 'وقود حافلات', nameEn: 'Bus Fuel', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5400' },
  { code: '154004', name: 'تأمين حافلات', nameEn: 'Bus Insurance', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5400' },
  { code: '154005', name: 'رواتب سائقين', nameEn: 'Driver Salaries', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5400' },
  { code: '154006', name: 'رواتب مشرفين', nameEn: 'Supervisor Salaries', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5400' },
  { code: '155001', name: 'كتب ومراجع للمكتبة', nameEn: 'Library Books', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5500' },
  { code: '155002', name: 'أدوات معامل', nameEn: 'Lab Equipment', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5500' },
  { code: '155003', name: 'أنشطة طلابية', nameEn: 'Student Activities', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5500' },
  { code: '155004', name: 'رحلات مدرسية', nameEn: 'School Trips', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5500' },
  { code: '155005', name: 'تدريب وتعليم', nameEn: 'Training & Education', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5500' },
  { code: '158001', name: 'إهلاك المباني', nameEn: 'Depreciation - Buildings', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5800', isSystemAccount: true },
  { code: '158002', name: 'إهلاك الأثاث', nameEn: 'Depreciation - Furniture', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5800', isSystemAccount: true },
  { code: '158003', name: 'إهلاك الأجهزة', nameEn: 'Depreciation - Equipment', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5800', isSystemAccount: true },
  { code: '158004', name: 'إهلاك الحافلات', nameEn: 'Depreciation - Buses', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5800', isSystemAccount: true },
  { code: '159001', name: 'مصروفات قانونية', nameEn: 'Legal Expenses', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5900' },
  { code: '159002', name: 'مصروفات ضرائب ورسوم', nameEn: 'Taxes & Fees', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5900' },
  { code: '159003', name: 'خسائر فروقات الصرف', nameEn: 'FX Losses', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5900' },
  { code: '159004', name: 'مصروفات طوارئ', nameEn: 'Emergency Expenses', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5900' },

  // Legacy codes for backward compatibility
  { code: '1001', name: 'الخزينة (قديم)', nameEn: 'Cash (Legacy)', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1100', isActive: false },
  { code: '1002', name: 'البنك (قديم)', nameEn: 'Bank (Legacy)', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1100', isActive: false },
] as const;

async function seedAccounts() {
  console.log('Seeding chart of accounts...');

  const codeToId = new Map<string, string>();

  // First pass: create/update all accounts without parentId
  for (const acc of accounts) {
    try {
      const existing = await prisma.account.findUnique({ where: { code: acc.code } });
      if (existing) {
        codeToId.set(acc.code, existing.id);
        await prisma.account.update({
          where: { code: acc.code },
          data: {
            nameEn: acc.nameEn,
            level: acc.level,
            normalBalance: acc.normalBalance,
            isSystemAccount: (acc as any).isSystemAccount || false,
            isActive: (acc as any).isActive !== false,
          }
        });
        continue;
      }
      const created = await prisma.account.create({
        data: {
          code: acc.code,
          name: acc.name,
          nameEn: acc.nameEn,
          type: acc.type,
          level: acc.level,
          normalBalance: acc.normalBalance,
          isSystemAccount: (acc as any).isSystemAccount || false,
          allowManualEntry: acc.level === 4,
          isActive: (acc as any).isActive !== false,
        }
      });
      codeToId.set(acc.code, created.id);
    } catch (e: any) {
      console.error(`Failed to create account ${acc.code}:`, e.message);
    }
  }

  // Second pass: set parentId
  for (const acc of accounts) {
    const parentCode = (acc as any).parentCode;
    if (parentCode) {
      const parentId = codeToId.get(parentCode);
      const childId = codeToId.get(acc.code);
      if (parentId && childId) {
        await prisma.account.update({
          where: { id: childId },
          data: { parentId }
        });
      }
    }
  }

  console.log('Chart of accounts seeded successfully!');
}

async function seedFiscalYear() {
  console.log('Seeding fiscal year and periods...');

  const existingYear = await prisma.fiscalYear.findFirst({ where: { yearCode: '2025-2026' } });
  if (existingYear) {
    console.log('Fiscal year already exists');
    return;
  }

  const fiscalYear = await prisma.fiscalYear.create({
    data: {
      yearCode: '2025-2026',
      nameAr: 'السنة المالية 2025-2026',
      nameEn: 'Fiscal Year 2025-2026',
      startDate: '2025-07-01',
      endDate: '2026-06-30',
      status: 'active'
    }
  });

  const months = [
    { code: '2025-07', nameAr: 'يوليو 2025', nameEn: 'July 2025', start: '2025-07-01', end: '2025-07-31' },
    { code: '2025-08', nameAr: 'أغسطس 2025', nameEn: 'August 2025', start: '2025-08-01', end: '2025-08-31' },
    { code: '2025-09', nameAr: 'سبتمبر 2025', nameEn: 'September 2025', start: '2025-09-01', end: '2025-09-30' },
    { code: '2025-10', nameAr: 'أكتوبر 2025', nameEn: 'October 2025', start: '2025-10-01', end: '2025-10-31' },
    { code: '2025-11', nameAr: 'نوفمبر 2025', nameEn: 'November 2025', start: '2025-11-01', end: '2025-11-30' },
    { code: '2025-12', nameAr: 'ديسمبر 2025', nameEn: 'December 2025', start: '2025-12-01', end: '2025-12-31' },
    { code: '2026-01', nameAr: 'يناير 2026', nameEn: 'January 2026', start: '2026-01-01', end: '2026-01-31' },
    { code: '2026-02', nameAr: 'فبراير 2026', nameEn: 'February 2026', start: '2026-02-01', end: '2026-02-28' },
    { code: '2026-03', nameAr: 'مارس 2026', nameEn: 'March 2026', start: '2026-03-01', end: '2026-03-31' },
    { code: '2026-04', nameAr: 'أبريل 2026', nameEn: 'April 2026', start: '2026-04-01', end: '2026-04-30' },
    { code: '2026-05', nameAr: 'مايو 2026', nameEn: 'May 2026', start: '2026-05-01', end: '2026-05-31' },
    { code: '2026-06', nameAr: 'يونيو 2026', nameEn: 'June 2026', start: '2026-06-01', end: '2026-06-30' },
  ];

  for (const m of months) {
    await prisma.accountingPeriod.create({
      data: {
        periodCode: m.code,
        nameAr: m.nameAr,
        nameEn: m.nameEn,
        startDate: m.start,
        endDate: m.end,
        fiscalYearId: fiscalYear.id,
        status: 'open'
      }
    });
  }

  console.log('Fiscal year and periods seeded!');
}

async function seedCostCenters() {
  console.log('Seeding cost centers...');
  const centers = [
    { code: 'ADMIN', nameAr: 'الإدارة', nameEn: 'Administration' },
    { code: 'TEACH', nameAr: 'التدريس', nameEn: 'Teaching' },
    { code: 'BUS', nameAr: 'النقل', nameEn: 'Transportation' },
    { code: 'STORE', nameAr: 'المخزن', nameEn: 'Warehouse' },
    { code: 'MAINT', nameAr: 'الصيانة', nameEn: 'Maintenance' },
  ];

  for (const c of centers) {
    const existing = await prisma.costCenter.findUnique({ where: { code: c.code } });
    if (!existing) {
      await prisma.costCenter.create({ data: { code: c.code, nameAr: c.nameAr, nameEn: c.nameEn } });
    }
  }
  console.log('Cost centers seeded!');
}

async function main() {
  await seedAccounts();
  await seedFiscalYear();
  await seedCostCenters();
  await prisma.$disconnect();
}

main().catch(console.error);
