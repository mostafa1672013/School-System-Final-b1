export type UserRole = 'system_admin' | 'school_director' | 'head_accountant' | 'accountant' | 'warehouse_keeper' | 'bus_supervisor';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
}

export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'transferred';
export type Stage = 'kg' | 'primary' | 'preparatory' | 'secondary';

export interface Student {
  id: string;
  nationalId: string;
  name: string;
  stage: Stage;
  grade: string;
  className: string;
  guardianName: string;
  guardianPhone: string;
  guardianPhone2?: string;
  address: string;
  enrollmentDate: string;
  status: StudentStatus;
  busRouteId?: string;
  totalFees: number;
  paidAmount: number;
}

export type PaymentType = 'tuition' | 'books' | 'uniform' | 'bus' | 'activities' | 'other';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check';

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  type: PaymentType;
  method: PaymentMethod;
  date: string;
  receiptNumber: string;
  collectedBy: string;
  notes?: string;
}

export type InstallmentStatus = 'paid' | 'pending' | 'overdue';

export interface InstallmentItem {
  id: string;
  dueDate: string;
  amount: number;
  status: InstallmentStatus;
  paidDate?: string;
}

export interface InstallmentPlan {
  id: string;
  studentId: string;
  studentName: string;
  totalAmount: number;
  numberOfInstallments: number;
  installments: InstallmentItem[];
  createdDate: string;
}

export type InventoryCategory = 'books' | 'uniform' | 'tools' | 'lab_equipment' | 'operational';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  minQuantity: number;
  unitPrice: number;
  grade?: string;
  description?: string;
  lastUpdated: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out';
  quantity: number;
  date: string;
  studentId?: string;
  studentName?: string;
  notes?: string;
  performedBy: string;
}

export interface BusRoute {
  id: string;
  name: string;
  driverName: string;
  driverPhone: string;
  busNumber: string;
  capacity: number;
  monthlyFee: number;
  annualFee: number;
  stops: string[];
}

export interface BusSubscription {
  id: string;
  studentId: string;
  studentName: string;
  routeId: string;
  routeName: string;
  type: 'monthly' | 'annual';
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
}
