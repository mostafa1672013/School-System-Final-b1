import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Students = lazy(() => import('@/pages/Students'));
const StudentDetail = lazy(() => import('@/pages/StudentDetail'));
const Payments = lazy(() => import('@/pages/Payments'));
const PaymentApprovals = lazy(() => import('@/pages/PaymentApprovals'));
const Inventory = lazy(() => import('@/pages/Inventory'));
const BusManagement = lazy(() => import('@/pages/BusManagement'));
const Reports = lazy(() => import('@/pages/Reports'));
const Users = lazy(() => import('@/pages/Users'));
const Admission = lazy(() => import('@/pages/Admission'));
const NewAdmission = lazy(() => import('@/pages/NewAdmission'));
const StageFeeManagement = lazy(() => import('@/pages/StageFeeManagement'));
const NewStageFee = lazy(() => import('@/pages/NewStageFee'));
const Profile = lazy(() => import('@/pages/Profile'));
const DiscountApprovals = lazy(() => import('@/pages/DiscountApprovals'));
const DiscountSettings = lazy(() => import('@/pages/DiscountSettings'));

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
            <Route path="/payments" element={<Payments />} />
            <Route path="/payment-approvals" element={<PaymentApprovals />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/bus" element={<BusManagement />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<Users />} />
            <Route path="/admission" element={<Admission />} />
            <Route path="/admission/new" element={<NewAdmission />} />
            <Route path="/stage-fees" element={<StageFeeManagement />} />
            <Route path="/stage-fees/new" element={<NewStageFee />} />
            <Route path="/discount-approvals" element={<DiscountApprovals />} />
            <Route path="/discount-settings" element={<DiscountSettings />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
