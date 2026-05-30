import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAuthHeaders } from './authStore';
import { currentAcademicYear as fallbackYear } from '@/lib/utils';

interface SettingsState {
  activeAcademicYear: string;
  isLoading: boolean;
  fetchAcademicYear: () => Promise<void>;
  setAcademicYear: (year: string) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      activeAcademicYear: fallbackYear,
      isLoading: false,
      fetchAcademicYear: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch('/api/settings/academic-year', { headers: getAuthHeaders() });
          if (!res.ok) throw new Error('fetch failed');
          const data = await res.json();
          set({ activeAcademicYear: data.academicYear, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },
      setAcademicYear: async (year: string) => {
        try {
          const res = await fetch('/api/settings/academic-year', {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ academicYear: year }),
          });
          if (!res.ok) return false;
          set({ activeAcademicYear: year });
          return true;
        } catch {
          return false;
        }
      },
    }),
    { name: 'school-settings' }
  )
);
