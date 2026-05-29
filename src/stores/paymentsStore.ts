import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Payment, InstallmentPlan } from '@/types';
import { mockPayments, mockInstallments } from '@/constants/mockData';
import { generateId } from '@/lib/utils';

interface PaymentsState {
  payments: Payment[];
  isLoading: boolean;
  fetchPayments: () => Promise<void>;
  addPayment: (payment: Omit<Payment, 'id'>) => Promise<string>;
  getStudentPayments: (studentId: string) => Payment[];
  installmentPlans: InstallmentPlan[];
  addInstallmentPlan: (plan: Omit<InstallmentPlan, 'id'>) => void;
  getStudentInstallments: (studentId: string) => InstallmentPlan[];
  payInstallment: (planId: string, installmentId: string) => void;
}

export const usePaymentsStore = create<PaymentsState>()(
  persist(
    (set, get) => ({
      payments: [],
      isLoading: false,
      installmentPlans: mockInstallments,
      fetchPayments: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('http://localhost:4000/api/payments');
          const data = await response.json();
          set({ payments: data, isLoading: false });
        } catch (error) {
          console.error('Fetch payments error:', error);
          set({ isLoading: false });
        }
      },
      addPayment: async (payment) => {
        try {
          const response = await fetch('http://localhost:4000/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payment),
          });
          const newPayment = await response.json();
          set((state) => ({ payments: [newPayment, ...state.payments] }));
          return newPayment.id;
        } catch (error) {
          console.error('Add payment error:', error);
          return '';
        }
      },
      getStudentPayments: (studentId) => get().payments.filter((p) => p.studentId === studentId),
      addInstallmentPlan: (plan) => set((state) => ({
        installmentPlans: [...state.installmentPlans, { ...plan, id: generateId() }],
      })),
      getStudentInstallments: (studentId) => get().installmentPlans.filter((p) => p.studentId === studentId),
      payInstallment: (planId, installmentId) => set((state) => ({
        installmentPlans: state.installmentPlans.map((plan) =>
          plan.id === planId
            ? {
              ...plan,
              installments: plan.installments.map((inst) =>
                inst.id === installmentId
                  ? { ...inst, status: 'paid' as const, paidDate: new Date().toISOString().split('T')[0] }
                  : inst
              ),
            }
            : plan
        ),
      })),
    }),
    { name: 'school-payments' }
  )
);
