import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Payment, InstallmentPlan } from '@/types';
import { mockPayments, mockInstallments } from '@/constants/mockData';
import { generateId } from '@/lib/utils';

interface PaymentsState {
  payments: Payment[];
  installmentPlans: InstallmentPlan[];
  addPayment: (payment: Omit<Payment, 'id'>) => string;
  getStudentPayments: (studentId: string) => Payment[];
  addInstallmentPlan: (plan: Omit<InstallmentPlan, 'id'>) => void;
  getStudentInstallments: (studentId: string) => InstallmentPlan[];
  payInstallment: (planId: string, installmentId: string) => void;
}

export const usePaymentsStore = create<PaymentsState>()(
  persist(
    (set, get) => ({
      payments: mockPayments,
      installmentPlans: mockInstallments,
      addPayment: (payment) => {
        const id = generateId();
        set((state) => ({
          payments: [{ ...payment, id }, ...state.payments],
        }));
        return id;
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
