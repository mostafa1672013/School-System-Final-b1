import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return '0 ج.م.';
  const value = typeof amount === 'number' ? amount : 0;
  if (isNaN(value)) return '0 ج.م.';
  
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr));
}

export function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(dateStr));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export const roleLabels: Record<string, string> = {
  system_admin: 'مدير النظام',
  school_director: 'مدير المدرسة',
  head_accountant: 'رئيس الحسابات',
  accountant: 'محاسب',
  warehouse_keeper: 'أمين المخزن',
  bus_supervisor: 'مشرف الباصات',
};

export const paymentTypeLabels: Record<string, string> = {
  tuition: 'رسوم دراسية',
  books: 'كتب',
  uniform: 'زي مدرسي',
  bus: 'باص',
  activities: 'أنشطة',
  other: 'أخرى',
};

export const paymentMethodLabels: Record<string, string> = {
  cash: 'نقدي',
  bank_transfer: 'تحويل بنكي',
  check: 'شيك',
};

export const categoryLabels: Record<string, string> = {
  books: 'كتب',
  uniform: 'زي مدرسي',
  tools: 'أدوات مكتبية',
  lab_equipment: 'أدوات معملية',
  operational: 'مستلزمات تشغيلية',
};

export const stageLabels: Record<string, string> = {
  kg: 'رياض الأطفال',
  primary: 'المرحلة الابتدائية',
  preparatory: 'المرحلة الإعدادية',
  secondary: 'المرحلة الثانوية',
};

export const trackLabels: Record<string, string> = {
  local: 'ناشونال (محلي)',
  international: 'انترناشونال (دولي)',
};

export const statusLabels: Record<string, string> = {
  applied: 'متقدم جديد',
  under_testing: 'تحت الاختبار',
  failed: 'لم يجتز الاختبار',
  fee_setup: 'إعداد الرسوم',
  pending_approval: 'بانتظار الاعتماد',
  admitted: 'مقبول / طالب نشط',
  inactive: 'غير نشط',
  graduated: 'متخرج',
  transferred: 'منقول',
};

export const gradeOptions: Record<string, string[]> = {
  kg: ['KG1', 'KG2'],
  primary: ['الصف الأول الابتدائي', 'الصف الثاني الابتدائي', 'الصف الثالث الابتدائي', 'الصف الرابع الابتدائي', 'الصف الخامس الابتدائي', 'الصف السادس الابتدائي'],
  preparatory: ['الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي'],
  secondary: ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'],
};

export const academicYears = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];
export const currentAcademicYear = '2024-2025';

export const discountLimits: Record<string, { maxPercentage: number, maxAmount: number }> = {
  accountant: { maxPercentage: 2, maxAmount: 1000 },
  head_accountant: { maxPercentage: 5, maxAmount: 5000 },
};
