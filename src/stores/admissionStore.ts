import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Student, StageFee } from '@/types';

interface AdmissionState {
  stageFees: StageFee[];
  isLoading: boolean;
  fetchStageFees: () => Promise<void>;
  saveStageFee: (data: Omit<StageFee, 'id'>) => Promise<void>;
  applyAdmission: (student: Partial<Student>) => Promise<Student>;
  setTestResult: (id: string, result: 'pass' | 'fail') => Promise<void>;
  setupFees: (id: string, fees: any) => Promise<void>;
  approveAdmission: (id: string) => Promise<void>;
  deleteStageFee: (id: string) => Promise<void>;
}

export const useAdmissionStore = create<AdmissionState>()(
  persist(
    (set, get) => ({
      stageFees: [],
      isLoading: false,
      fetchStageFees: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('http://localhost:4000/api/stage-fees');
          const data = await response.json();
          set({ stageFees: data, isLoading: false });
        } catch (error) {
          console.error('Fetch stage fees error:', error);
          set({ isLoading: false });
        }
      },
      saveStageFee: async (feeData) => {
        try {
          const isUpdate = 'id' in feeData && (feeData as any).id;
          const url = isUpdate 
            ? `http://localhost:4000/api/stage-fees/${(feeData as any).id}` 
            : 'http://localhost:4000/api/stage-fees';
          
          const response = await fetch(url, {
            method: isUpdate ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feeData),
          });

          if (response.status === 409) {
            const err = await response.json();
            throw new Error(err.error);
          }

          if (!response.ok) throw new Error('Failed to save');

          const savedFee = await response.json();
          set((state) => {
            const index = state.stageFees.findIndex(f => f.id === savedFee.id);
            if (index !== -1) {
              const updated = [...state.stageFees];
              updated[index] = savedFee;
              return { stageFees: updated };
            }
            return { stageFees: [savedFee, ...state.stageFees] };
          });
        } catch (error: any) {
          console.error('Save stage fee error:', error);
          throw error;
        }
      },
      applyAdmission: async (studentData) => {
        const response = await fetch('http://localhost:4000/api/admission/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studentData),
        });
        return await response.json();
      },
      setTestResult: async (id, result) => {
        await fetch(`http://localhost:4000/api/admission/test-result/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ result }),
        });
      },
      setupFees: async (id, fees) => {
        await fetch(`http://localhost:4000/api/admission/setup-fees/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fees),
        });
      },
      approveAdmission: async (id) => {
        await fetch(`http://localhost:4000/api/admission/approve/${id}`, {
          method: 'PATCH',
        });
      },
      deleteStageFee: async (id) => {
        const response = await fetch(`http://localhost:4000/api/stage-fees/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete');
        set((state) => ({
          stageFees: state.stageFees.filter(f => f.id !== id)
        }));
      },
    }),
    { name: 'school-admission-v2' }
  )
);
