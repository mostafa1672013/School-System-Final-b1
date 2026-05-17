import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Payment, InstallmentPlan } from '@/types';
import { mockPayments, mockInstallments } from '@/constants/mockData';
import { generateId } from '@/lib/utils';

export interface PendingPlanEdit {
  id: string;
  planId: string;
  studentId: string;
  studentName: string;
  oldTotal: number;
  newTotal: number;
  oldInstallments: any[];
  newInstallments: any[];
  requestDate: string;
  requestedBy: string;
}

interface PaymentsState {
  payments: Payment[];
  isLoading: boolean;
  fetchPayments: () => Promise<void>;
  addPayment: (payment: Omit<Payment, 'id'>) => Promise<string>;
  getStudentPayments: (studentId: string) => Payment[];
  installmentPlans: InstallmentPlan[];
  addInstallmentPlan: (plan: Omit<InstallmentPlan, 'id'>) => void;
  getStudentInstallments: (studentId: string) => InstallmentPlan[];
  updateInstallmentPlan: (planId: string, updates: Partial<InstallmentPlan>) => void;
  payInstallment: (planId: string, installmentId: string, amount: number) => void;
  pendingPlanEdits: PendingPlanEdit[];
  addPendingPlanEdit: (edit: Omit<PendingPlanEdit, 'id'>) => void;
  approvePlanEdit: (editId: string) => void;
  rejectPlanEdit: (editId: string) => void;
}

export const usePaymentsStore = create<PaymentsState>()(
  persist(
    (set, get) => ({
      payments: [],
      isLoading: false,
      installmentPlans: mockInstallments,
      pendingPlanEdits: [],
      fetchPayments: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/payments');
          const data = await response.json();
          set({ payments: data, isLoading: false });
        } catch (error) {
          console.error('Fetch payments error:', error);
          set({ isLoading: false });
        }
      },
      addPayment: async (payment) => {
        try {
          const response = await fetch('/api/payments', {
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
      updateInstallmentPlan: (planId, updates) => set((state) => ({
        installmentPlans: state.installmentPlans.map((plan) => 
          plan.id === planId ? { ...plan, ...updates } : plan
        ),
      })),
      addPendingPlanEdit: (edit) => set((state) => ({
        pendingPlanEdits: [...state.pendingPlanEdits, { ...edit, id: generateId() }]
      })),
      approvePlanEdit: (editId) => set((state) => {
        const edit = state.pendingPlanEdits.find(e => e.id === editId);
        if (!edit) return state;
        return {
          installmentPlans: state.installmentPlans.map((plan) => 
            plan.id === edit.planId ? { ...plan, totalAmount: edit.newTotal, installments: edit.newInstallments } : plan
          ),
          pendingPlanEdits: state.pendingPlanEdits.filter(e => e.id !== editId)
        };
      }),
      rejectPlanEdit: (editId) => set((state) => ({
        pendingPlanEdits: state.pendingPlanEdits.filter(e => e.id !== editId)
      })),
      getStudentInstallments: (studentId) => get().installmentPlans.filter((p) => p.studentId === studentId),
      payInstallment: (planId, installmentId, amount) => set((state) => ({
        installmentPlans: state.installmentPlans.map((plan) =>
          plan.id === planId
            ? {
              ...plan,
              installments: plan.installments.map((inst) => {
                if (inst.id === installmentId) {
                  const newPaidAmount = (inst.paidAmount || 0) + amount;
                  const newStatus = newPaidAmount >= inst.amount ? 'paid' : 'pending';
                  return { 
                    ...inst, 
                    paidAmount: newPaidAmount, 
                    status: newStatus, 
                    paidDate: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : inst.paidDate 
                  };
                }
                return inst;
              }),
            }
            : plan
        ),
      })),
    }),
    { name: 'school-payments' }
  )
);
