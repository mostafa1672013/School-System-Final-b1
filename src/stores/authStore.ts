import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (email, password) => {
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (response.status === 403) {
            import('sonner').then(({ toast }) => toast.error('هذا الحساب معطل. يرجى التواصل مع الإدارة.'));
            return false;
          }
          if (!response.ok) {
            import('sonner').then(({ toast }) => toast.error('بيانات الدخول غير صحيحة'));
            return false;
          }

          const { user, token } = await response.json();
          set({ user, token, isAuthenticated: true });
          // Fetch active academic year after login
          import('@/stores/settingsStore').then(({ useSettingsStore }) => {
            useSettingsStore.getState().fetchAcademicYear();
          });
          return true;
        } catch (error) {
          console.error('Login error:', error);
          import('sonner').then(({ toast }) => {
            toast.error('لا يمكن الاتصال بالسيرفر. تأكد من تشغيله على منفذ 4000');
          });
          return false;
        }
      },
      updateProfile: async (data) => {
        const currentUser = get().user;
        const token = get().token;
        if (!currentUser || !token) return false;
        try {
          const response = await fetch(`/api/users/${currentUser.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(data),
          });
          if (!response.ok) return false;
          const updatedUser = await response.json();
          set({ user: updatedUser });
          return true;
        } catch (error) {
          console.error('Update profile error:', error);
          return false;
        }
      },
      logout: () => {
        const token = get().token;
        if (token) {
          fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }).catch(() => {});
        }
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'school-auth',
      // sessionStorage: session ends when browser/tab is closed
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

// Helper function to get auth headers for API calls
export const getAuthHeaders = () => {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};
