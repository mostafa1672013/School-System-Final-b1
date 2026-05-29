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
const Inventory = lazy(() => import('@/pages/Inventory'));
const BusManagement = lazy(() => import('@/pages/BusManagement'));
const Reports = lazy(() => import('@/pages/Reports'));
const Users = lazy(() => import('@/pages/Users'));

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
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/bus" element={<BusManagement />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<Users />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
