import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAdmissionStore } from '@/stores/admissionStore';
import type { StageFee, Student } from '@/types';

const globalFetch = global.fetch;

const mockStageFee: StageFee = {
  id: 'fee-1',
  stage: 'primary',
  grade: 'الصف الأول الابتدائي',
  track: 'local',
  academicYear: '2024-2025',
  tuitionFees: 5000,
  booksFees: 1000,
  uniformFees: 500,
  applicationFees: 200,
};

describe('Admission Store', () => {
  beforeEach(() => {
    useAdmissionStore.setState({
      stageFees: [],
      isLoading: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  describe('fetchStageFees', () => {
    it('fetches stage fees and updates state', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockStageFee]),
      });

      await useAdmissionStore.getState().fetchStageFees();

      const state = useAdmissionStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.stageFees).toHaveLength(1);
      expect(state.stageFees[0]).toEqual(mockStageFee);
    });

    it('handles fetch failure gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await useAdmissionStore.getState().fetchStageFees();

      const state = useAdmissionStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.stageFees).toHaveLength(0);
    });
  });

  describe('saveStageFee', () => {
    it('adds new stage fee on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStageFee),
      });

      await useAdmissionStore.getState().saveStageFee({ ...mockStageFee, id: undefined } as any);

      const state = useAdmissionStore.getState();
      expect(state.stageFees).toHaveLength(1);
      expect(state.stageFees[0]).toEqual(mockStageFee);
      expect(global.fetch).toHaveBeenCalledWith('/api/stage-fees', expect.objectContaining({ method: 'POST' }));
    });

    it('updates existing stage fee', async () => {
      useAdmissionStore.setState({ stageFees: [mockStageFee] });
      const updatedFee = { ...mockStageFee, tuitionFees: 6000 };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(updatedFee),
      });

      await useAdmissionStore.getState().saveStageFee(updatedFee);

      const state = useAdmissionStore.getState();
      expect(state.stageFees).toHaveLength(1);
      expect(state.stageFees[0].tuitionFees).toBe(6000);
      expect(global.fetch).toHaveBeenCalledWith('/api/stage-fees/fee-1', expect.objectContaining({ method: 'PATCH' }));
    });

    it('throws error on 409 conflict', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'Fee already exists for this stage/grade' }),
      });

      await expect(useAdmissionStore.getState().saveStageFee({ ...mockStageFee, id: undefined } as any))
        .rejects.toThrow('Fee already exists for this stage/grade');
    });
  });

  describe('Student Admission Flow', () => {
    it('applyAdmission returns student on success', async () => {
      const mockStudent = { id: 'std-1', name: 'New Student', status: 'applied' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStudent),
      });

      const result = await useAdmissionStore.getState().applyAdmission({ name: 'New Student' });

      expect(result).toEqual(mockStudent);
      expect(global.fetch).toHaveBeenCalledWith('/api/admission/apply', expect.objectContaining({ method: 'POST' }));
    });

    it('applyAdmission throws on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid data' }),
      });

      await expect(useAdmissionStore.getState().applyAdmission({})).rejects.toThrow('Invalid data');
    });

    it('setTestResult succeeds', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      await expect(useAdmissionStore.getState().setTestResult('std-1', 'pass')).resolves.toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith('/api/admission/test-result/std-1', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ result: 'pass' })
      }));
    });

    it('setupFees succeeds', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      await expect(useAdmissionStore.getState().setupFees('std-1', { tuitionFees: 5000 })).resolves.toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith('/api/admission/setup-fees/std-1', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ tuitionFees: 5000 })
      }));
    });

    it('approveAdmission succeeds', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      await expect(useAdmissionStore.getState().approveAdmission('std-1')).resolves.toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith('/api/admission/approve/std-1', expect.objectContaining({
        method: 'PATCH',
      }));
    });
  });

  describe('deleteStageFee', () => {
    it('removes stage fee on success', async () => {
      useAdmissionStore.setState({ stageFees: [mockStageFee] });
      
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      await useAdmissionStore.getState().deleteStageFee('fee-1');

      expect(useAdmissionStore.getState().stageFees).toHaveLength(0);
      expect(global.fetch).toHaveBeenCalledWith('/api/stage-fees/fee-1', expect.objectContaining({ method: 'DELETE' }));
    });
  });
});
