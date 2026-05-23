export type UserRole = 'system_admin' | 'school_director' | 'head_accountant' | 'accountant' | 'warehouse_keeper' | 'bus_supervisor' | 'student_affairs';

export interface Badge {
  id: string;
  name: string;
  color: string;
  icon?: string;
  discountPercentage: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { students: number };
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  active: boolean;
  discountLimitPercent: number;
  avatar?: string | null;
  isOnline?: boolean;
  lastLoginAt?: Date | null;
  lastLogoutAt?: Date | null;
  createdAt?: Date;
}

export type StudentStatus = 'applied' | 'under_testing' | 'fee_setup' | 'pending_approval' | 'active' | 'admitted' | 'inactive' | 'graduated' | 'transferred';
export type Stage = 'kg' | 'primary' | 'preparatory' | 'secondary';
export type Track = 'local' | 'international';

export interface AdditionalFee {
  name: string;
  amount: number;
  isMandatory: boolean;
}

export interface StudentYearlyFinance {
  id: string;
  studentId: string;
  academicYear: string;
  grade: string;
  stage: Stage;
  tuitionFees: number;
  booksFees: number;
  uniformFees: number;
  busFees: number;
  otherFees: number;
  arrearsFees: number;
  totalFees: number;
  paidAmount: number;
}

export interface Student {
  id: string;
  nationalId: string;
  name: string;
  photoUrl?: string;
  stage: Stage;
  grade: string;
  track: Track;
  academicYear: string;
  className?: string;
  guardianName: string;
  guardianPhone: string;
  address?: string;
  birthDate?: string;
  enrollmentDate?: string;
  status: StudentStatus;
  hasSiblings: boolean;
  testResult?: 'pass' | 'fail';
  tuitionFees: number;
  booksFees: number;
  uniformFees: number;
  busFees: number;
  otherFees: number;
  arrearsFees: number;
  totalFees: number;
  paidAmount: number;
  discountAmount: number;
  discountPercentage: number;
  discountApprovedBy?: string;
  discountStatus: 'approved' | 'pending' | 'rejected';
  requestedDiscountAmount?: number;
  requestedDiscountPercentage?: number;
  discountRequesterId?: string;
  discountApproverId?: string;
  busRouteId?: string;
  badgeId?: string | null;
  badge?: Badge | null;
  documents?: Record<string, { name: string, url: string, label: string }>;
  extraFields?: { label: string, value: string }[];
  additionalFees?: AdditionalFee[];
  pendingPaymentAmount?: number;
  pendingPaymentType?: string;
  pendingPaymentMethod?: string;
  pendingWalletPhoneNumber?: string;
  pendingPaymentNotes?: string;
  pendingInstallmentPlanId?: string;
  paymentRequestStatus?: string;
  yearlyFinance?: StudentYearlyFinance[];
}

export interface StageFee {
  id: string;
  stage: Stage;
  grade: string;
  track: Track;
  academicYear: string;
  tuitionFees: number;
  booksFees: number;
  uniformFees: number;
  applicationFees: number;
  additionalFees?: AdditionalFee[];
}

export type PaymentType = 'tuition' | 'books' | 'uniform' | 'bus' | 'activities' | 'other' | 'application_fee' | 'arrears';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'wallet';

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
  walletPhoneNumber?: string;
  sessionId?: string | null;
  academicYear?: string;
}

export type InstallmentStatus = 'paid' | 'pending' | 'overdue';

export interface InstallmentItem {
  id: string;
  dueDate: string;
  amount: number;
  paidAmount?: number;
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

export type InventoryCategory = string; // Dynamic categories populated from ItemCategory API

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  itemType: 'sale' | 'consumable';
  quantity: number;
  minQuantity: number;
  maxQuantity?: number;
  unit: string;
  unitCost: number;
  unitPrice: number;
  grade?: string;
  description?: string;
  lastUpdated: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  item?: InventoryItem;
  itemName?: string;
  type: 'in' | 'out';
  subType?: 'purchase' | 'sale' | 'consumption' | 'adjustment';
  quantity: number;
  unitCostSnapshot: number;
  unitPriceSnapshot: number;
  totalAmount: number;
  supplierName?: string;
  departmentName?: string;
  studentId?: string;
  studentName?: string;
  notes?: string;
  performedBy: string;
  performedByUserId?: string;
  journalEntryId?: string;
  date: string;
  createdAt: string;
}

export interface ItemCategory {
  id: string;
  key: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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

export type SubscriberType = 'student' | 'employee' | 'supervisor';

export interface BusSubscription {
  id: string;
  code: string;
  subscriberType: SubscriberType;
  studentId?: string;
  subscriberName: string;
  routeId: string;
  route?: BusRoute;
  academicYear: string;
  startDate: string;
  endDate?: string;
  fullFeeAmount: number;
  discountPct: number;
  actualAmount: number;
  pickupAddress?: string;
  pickupPhone?: string;
  status: 'active' | 'suspended' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionInput {
  subscriberType: SubscriberType;
  studentId?: string;
  subscriberName: string;
  routeId: string;
  academicYear: string;
  startDate: string;
  endDate?: string;
  fullFeeAmount: number;
  discountPct: number;
  actualAmount: number;
  pickupAddress?: string;
  pickupPhone?: string;
  notes?: string;
}

export interface RentalCompany {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  bankName?: string;
  bankAccountNumber?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { contracts: number; drivers: number };
}

export interface RentalContract {
  id: string;
  companyId: string;
  company?: RentalCompany;
  contractNumber: string;
  title?: string;
  startDate: string;
  endDate: string;
  monthlyFeePerBus: number;
  busesCount: number;
  includesDriver: boolean;
  includesFuel: boolean;
  includesMaintenance: boolean;
  includesInsurance: boolean;
  paymentFrequency: string;
  paymentDueDay?: number;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { buses: number };
}

export interface FleetBus {
  id: string;
  code: string;
  plateNumber: string;
  capacity: number;
  ownershipType: 'rented_full' | 'rented_no_driver' | 'owned';
  rentalContractId?: string;
  rentalContract?: RentalContract;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  status: 'active' | 'maintenance' | 'retired';
  insuranceExpiry?: string;
  licenseExpiry?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalDriver {
  id: string;
  code: string;
  fullName: string;
  phone?: string;
  companyId: string;
  company?: RentalCompany;
  licenseNumber?: string;
  licenseExpiry?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  type: string;
  level?: number;
  normalBalance?: string;
  parentId?: string | null;
  isSystemAccount?: boolean;
  allowManualEntry?: boolean;
  isActive?: boolean;
  subAccounts?: Account[];
  createdAt: string;
  updatedAt: string;
}

export interface FiscalYear {
  id: string;
  yearCode: string;
  nameAr: string;
  nameEn: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'closed';
  closedAt?: string;
  closedBy?: string;
  createdAt: string;
  periods?: AccountingPeriod[];
}

export interface AccountingPeriod {
  id: string;
  periodCode: string;
  nameAr: string;
  nameEn: string;
  startDate: string;
  endDate: string;
  fiscalYearId: string;
  fiscalYear?: FiscalYear;
  status: 'open' | 'closed' | 'locked';
  closedAt?: string;
  closedBy?: string;
  createdAt: string;
}

export interface CostCenter {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  createdAt: string;
  children?: CostCenter[];
}

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  account?: Account;
  debit: number;
  credit: number;
  description?: string;
  costCenterId?: string;
  costCenter?: CostCenter;
  lineNumber: number;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  postingDate?: string;
  description: string;
  notes?: string;
  referenceType?: string;
  referenceId?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'posted' | 'reversed';
  periodId?: string;
  period?: AccountingPeriod;
  isReversal: boolean;
  reversalOfId?: string;
  reversedById?: string;
  lines: JournalEntryLine[];
  createdAt: string;
  createdBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  postedAt?: string;
  postedBy?: string;
}

export interface Expense {
  id: string;
  amount: number;
  date: string;
  description: string;
  accountId: string;
  account?: Account;
  paymentMethod: string;
  status: 'pending' | 'approved' | 'rejected' | 'pending_approval' | 'pending_treasury' | 'paid';
  requestedBy: string;
  approvedBy?: string | null;
  paidBy?: string | null;
  notes?: string | null;
  sessionId?: string | null;
  createdAt: string;
}

// ===== Treasury Types =====

export type TreasurySessionStatus = 'open' | 'pending_close' | 'closed' | 'pending_reopen';

export interface TreasurySession {
  id: string;
  date: string;
  openingBalance: number;
  closingBalance: number | null;
  actualBalance: number | null;
  difference: number | null;
  status: TreasurySessionStatus;
  openedBy: string;
  openedByName?: string;
  reopenRequestedByName?: string;
  closedBy: string | null;
  closureNote: string | null;
  approvedBy: string | null;
  openedAt: string;
  closedAt: string | null;
  payments?: Payment[];
  expenses?: Expense[];
}

export interface TreasuryStatus {
  status: 'open' | 'pending_close' | 'no_session' | 'pending_reopen';
  session?: TreasurySession;
  totalIncome?: number;
  totalExpenses?: number;
  currentBalance?: number;
  paymentsCount?: number;
  expensesCount?: number;
  suggestedOpeningBalance?: number | null;
  isFirstEver?: boolean;
  closedToday?: boolean;
  userHasPreviousSession?: boolean;
  reopenRequestedByName?: string;
}

export interface TreasuryCloseResult {
  status: 'closed' | 'needs_approval';
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  sessionId?: string;
  session?: TreasurySession;
}

export interface SystemSetting {
  key: string;
  value: string;
}
