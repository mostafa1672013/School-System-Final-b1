import { getAuthHeaders } from './authStore';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Payment, InstallmentPlan } from '@/types';
import { mockPayments } from '@/constants/mockData';
import { generateId } from '@/lib/utils';
import { toast } from 'sonner';

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
  
  // Installment Methods
  installmentPlans: Record<string, InstallmentPlan>; // studentId -> Plan
  fetchStudentInstallments: (studentId: string) => Promise<InstallmentPlan | null>;
  saveInstallmentPlan: (studentId: string, totalAmount: number, academicYear: string, installments: any[]) => Promise<boolean>;
  payInstallment: (installmentId: string, amount: number, paidDate: string) => Promise<boolean>;
  deleteInstallmentPlan: (studentId: string) => Promise<boolean>;
  
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
      installmentPlans: {},
      pendingPlanEdits: [],

      fetchPayments: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/payments', { headers: getAuthHeaders() });
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
            headers: getAuthHeaders(),
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

      // Installment Implementations
      fetchStudentInstallments: async (studentId) => {
        try {
          const response = await fetch(`/api/installments/${studentId}`, { headers: getAuthHeaders() });
          if (!response.ok) return null;
          const plan = await response.json();
          if (plan) {
            set(state => ({
              installmentPlans: { ...state.installmentPlans, [studentId]: plan }
            }));
          }
          return plan;
        } catch (error) {
          console.error('Fetch installments error:', error);
          return null;
        }
      },

      saveInstallmentPlan: async (studentId, totalAmount, academicYear, installments) => {
        try {
          const response = await fetch('/api/installments', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ studentId, totalAmount, academicYear, installments }),
          });
          if (response.ok) {
            const plan = await response.json();
            set(state => ({
              installmentPlans: { ...state.installmentPlans, [studentId]: plan }
            }));
            return true;
          }
          return false;
        } catch (error) {
          console.error('Save plan error:', error);
          return false;
        }
      },

      payInstallment: async (installmentId, amount, paidDate) => {
        try {
          // This logic is simplified; in a real app, you'd calculate status on server
          const status = 'paid'; // Placeholder
          const response = await fetch(`/api/installments/${installmentId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ paidAmount: amount, status, paidDate }),
          });
          return response.ok;
        } catch (error) {
          console.error('Pay installment error:', error);
          return false;
        }
      },

      deleteInstallmentPlan: async (studentId) => {
        try {
          const response = await fetch(`/api/installments/plan/${studentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          if (response.ok) {
            set(state => {
              const newPlans = { ...state.installmentPlans };
              delete newPlans[studentId];
              return { installmentPlans: newPlans };
            });
            return true;
          }
          return false;
        } catch (error) {
          console.error('Delete plan error:', error);
          return false;
        }
      },

      addPendingPlanEdit: (edit) => set((state) => ({
        pendingPlanEdits: [...state.pendingPlanEdits, { ...edit, id: generateId() }]
      })),
      
      approvePlanEdit: (editId) => set((state) => {
        const edit = state.pendingPlanEdits.find(e => e.id === editId);
        if (!edit) return state;
        // This will need server implementation eventually, for now just UI state
        return {
          pendingPlanEdits: state.pendingPlanEdits.filter(e => e.id !== editId)
        };
      }),

      rejectPlanEdit: (editId) => set((state) => ({
        pendingPlanEdits: state.pendingPlanEdits.filter(e => e.id !== editId)
      })),
    }),
    { 
      name: 'school-payments',
      partialize: (state) => ({ payments: state.payments }), // Only persist payments for offline view
    }
  )
);
