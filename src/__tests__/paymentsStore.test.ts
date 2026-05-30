import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePaymentsStore } from '@/stores/paymentsStore';
import type { Payment, InstallmentPlan } from '@/types';

const globalFetch = global.fetch;

const mockPayment: Payment = {
  id: 'pay-1',
  studentId: 'stud-1',
  studentName: 'Test Student',
  amount: 1500,
  type: 'tuition',
  method: 'cash',
  date: '2024-06-15',
  receiptNumber: 'REC-001',
  collectedBy: 'admin',
};

const mockPlan: InstallmentPlan = {
  id: 'plan-1',
  studentId: 'stud-1',
  studentName: 'Test Student',
  totalAmount: 5000,
  numberOfInstallments: 2,
  createdDate: '2024-06-01',
  installments: [
    { id: 'inst-1', dueDate: '2024-07-01', amount: 2500, status: 'paid', paidAmount: 2500, paidDate: '2024-06-15' },
    { id: 'inst-2', dueDate: '2024-08-01', amount: 2500, status: 'pending' },
  ]
};

describe('Payments Store', () => {
  beforeEach(() => {
    usePaymentsStore.setState({
      payments: [],
      isLoading: false,
      installmentPlans: {},
      pendingPlanEdits: [],
      inventoryTx: {},
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  describe('fetchPayments', () => {
    it('fetches payments and updates state', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockPayment]),
      });

      await usePaymentsStore.getState().fetchPayments();

      const state = usePaymentsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.payments).toHaveLength(1);
      expect(state.payments[0]).toEqual(mockPayment);
    });

    it('handles fetch failure gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await usePaymentsStore.getState().fetchPayments();

      const state = usePaymentsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.payments).toHaveLength(0);
    });
  });

  describe('addPayment', () => {
    it('adds a new payment to the store and returns its ID', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPayment),
      });

      const newPaymentData = { ...mockPayment, id: undefined };
      const id = await usePaymentsStore.getState().addPayment(newPaymentData as any);

      expect(id).toBe('pay-1');
      const state = usePaymentsStore.getState();
      expect(state.payments).toHaveLength(1);
      expect(state.payments[0]).toEqual(mockPayment);
    });

    it('returns empty string on failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed'));

      const id = await usePaymentsStore.getState().addPayment({} as any);

      expect(id).toBe('');
      const state = usePaymentsStore.getState();
      expect(state.payments).toHaveLength(0);
    });
  });

  describe('getStudentPayments', () => {
    it('filters payments by studentId', () => {
      const p2 = { ...mockPayment, id: 'pay-2', studentId: 'stud-2' };
      usePaymentsStore.setState({ payments: [mockPayment, p2] });

      const stud1Payments = usePaymentsStore.getState().getStudentPayments('stud-1');
      expect(stud1Payments).toHaveLength(1);
      expect(stud1Payments[0].id).toBe('pay-1');
    });
  });

  describe('Installment Plans', () => {
    it('fetchStudentInstallments updates state and returns plan', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPlan),
      });

      const plan = await usePaymentsStore.getState().fetchStudentInstallments('stud-1');

      expect(plan).toEqual(mockPlan);
      expect(usePaymentsStore.getState().installmentPlans['stud-1']).toEqual(mockPlan);
    });

    it('fetchStudentInstallments returns null on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      const plan = await usePaymentsStore.getState().fetchStudentInstallments('stud-1');
      expect(plan).toBeNull();
    });

    it('saveInstallmentPlan returns true on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPlan),
      });

      const success = await usePaymentsStore.getState().saveInstallmentPlan('stud-1', 5000, '2024-2025', mockPlan.installments);

      expect(success).toBe(true);
      expect(usePaymentsStore.getState().installmentPlans['stud-1']).toEqual(mockPlan);
    });

    it('payInstallment returns true on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const success = await usePaymentsStore.getState().payInstallment('inst-2', 2500, '2024-07-15');

      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/installments/inst-2', expect.objectContaining({ method: 'PATCH' }));
    });

    it('deleteInstallmentPlan returns true and updates state', async () => {
      usePaymentsStore.setState({ installmentPlans: { 'stud-1': mockPlan } });
      
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const success = await usePaymentsStore.getState().deleteInstallmentPlan('stud-1');

      expect(success).toBe(true);
      expect(usePaymentsStore.getState().installmentPlans['stud-1']).toBeUndefined();
    });
  });

  describe('Pending Plan Edits', () => {
    it('adds pending edit, approves it, and removes it', () => {
      // Temporarily mock generateId to return a predictable ID
      vi.mock('@/lib/utils', async () => {
        const actual = await vi.importActual('@/lib/utils');
        return {
          ...actual,
          generateId: () => 'edit-123',
        };
      });

      const edit = {
        planId: 'plan-1',
        studentId: 'stud-1',
        studentName: 'Test',
        oldTotal: 5000,
        newTotal: 6000,
        oldInstallments: [],
        newInstallments: [],
        requestDate: '2024-06-01',
        requestedBy: 'admin',
      };

      // Add
      usePaymentsStore.getState().addPendingPlanEdit(edit);
      let state = usePaymentsStore.getState();
      expect(state.pendingPlanEdits).toHaveLength(1);
      // We don't check ID string exactly since generateId isn't easily mocked mid-file without hoisted vi.mock
      const generatedId = state.pendingPlanEdits[0].id;
      expect(generatedId).toBeTruthy();

      // Approve (currently just removes from UI state)
      usePaymentsStore.getState().approvePlanEdit(generatedId);
      state = usePaymentsStore.getState();
      expect(state.pendingPlanEdits).toHaveLength(0);
    });

    it('rejects plan edit and removes it', () => {
      usePaymentsStore.setState({
        pendingPlanEdits: [{ id: 'edit-1', planId: 'p-1', studentId: 's-1' } as any]
      });

      usePaymentsStore.getState().rejectPlanEdit('edit-1');
      expect(usePaymentsStore.getState().pendingPlanEdits).toHaveLength(0);
    });
  });
});
