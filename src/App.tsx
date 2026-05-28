import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Students = lazy(() => import('@/pages/Students'));
const StudentDetail = lazy(() => import('@/pages/StudentDetail'));
const StudentPromotion = lazy(() => import('@/pages/StudentPromotion'));
const Payments = lazy(() => import('@/pages/Payments'));
const PaymentApprovals = lazy(() => import('@/pages/PaymentApprovals'));
const Treasury = lazy(() => import('@/pages/Treasury'));
const Inventory = lazy(() => import('@/pages/Inventory'));
const Suppliers = lazy(() => import('@/pages/Suppliers'));
const Purchasing = lazy(() => import('@/pages/Purchasing'));
const BusManagement = lazy(() => import('@/pages/BusManagement'));
const Reports = lazy(() => import('@/pages/Reports'));
const Users = lazy(() => import('@/pages/Users'));
const DatabaseManagement = lazy(() => import('@/pages/DatabaseManagement'));
const SystemLogs = lazy(() => import('@/pages/SystemLogs'));
const DataMigration = lazy(() => import('@/pages/DataMigration'));
const Admission = lazy(() => import('@/pages/Admission'));
const NewAdmission = lazy(() => import('@/pages/NewAdmission'));
const StageFeeManagement = lazy(() => import('@/pages/StageFeeManagement'));
const NewStageFee = lazy(() => import('@/pages/NewStageFee'));
const Profile = lazy(() => import('@/pages/Profile'));
const DiscountApprovals = lazy(() => import('@/pages/DiscountApprovals'));
const DiscountSettings = lazy(() => import('@/pages/DiscountSettings'));
const BadgeSettings = lazy(() => import('@/pages/BadgeSettings'));
const ChartOfAccounts = lazy(() => import('@/pages/ChartOfAccounts'));
const JournalEntries = lazy(() => import('@/pages/JournalEntries'));
const AccountingPeriods = lazy(() => import('@/pages/AccountingPeriods'));
const AccountingReports = lazy(() => import('@/pages/AccountingReports'));
const Expenses = lazy(() => import('@/pages/Expenses'));
const GradeItemLists = lazy(() => import('@/pages/GradeItemLists'));
const DeliveryOrders = lazy(() => import('@/pages/DeliveryOrders'));
const InventoryDistribution = lazy(() => import('@/pages/InventoryDistribution'));
const ExpenseApprovals = lazy(() => import('@/pages/ExpenseApprovals'));
const ExpensePermissions = lazy(() => import('@/pages/ExpensePermissions'));
const YearManagement = lazy(() => import('@/pages/YearManagement'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Toaster position="top-center" dir="rtl" richColors closeButton />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id" element={<StudentDetail />} />
            <Route path="/student-promotion" element={<StudentPromotion />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/payment-approvals" element={<PaymentApprovals />} />
            <Route path="/treasury" element={<Treasury />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/purchasing" element={<Purchasing />} />
            <Route path="/bus" element={<BusManagement />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<Users />} />
            <Route path="/database" element={<DatabaseManagement />} />
            <Route path="/data-migration" element={<DataMigration />} />
            <Route path="/system-logs" element={<SystemLogs />} />
            <Route path="/admission" element={<Admission />} />
            <Route path="/admission/new" element={<NewAdmission />} />
            <Route path="/stage-fees" element={<StageFeeManagement />} />
            <Route path="/stage-fees/new" element={<NewStageFee />} />
            <Route path="/year-management" element={<YearManagement />} />
            <Route path="/discount-approvals" element={<DiscountApprovals />} />
            <Route path="/discount-settings" element={<DiscountSettings />} />
            <Route path="/badge-settings" element={<BadgeSettings />} />
            <Route path="/accounts" element={<ChartOfAccounts />} />
            <Route path="/journal-entries" element={<JournalEntries />} />
            <Route path="/accounting-periods" element={<AccountingPeriods />} />
            <Route path="/accounting-reports" element={<AccountingReports />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/expense-approvals" element={<ExpenseApprovals />} />
            <Route path="/expense-permissions" element={<ExpensePermissions />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/grade-item-lists" element={<GradeItemLists />} />
            <Route path="/delivery-orders" element={<DeliveryOrders />} />
            <Route path="/inventory-distribution" element={<InventoryDistribution />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
