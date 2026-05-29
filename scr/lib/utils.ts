import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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

export const statusLabels: Record<string, string> = {
  active: 'نشط',
  inactive: 'غير نشط',
  graduated: 'متخرج',
  transferred: 'منقول',
};
