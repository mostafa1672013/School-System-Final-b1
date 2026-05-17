import { create } from 'zustand';
import { toast } from 'sonner';
import type { User } from '@/types';

interface UsersState {
  users: User[];
  isLoading: boolean;
  fetchUsers: () => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  toggleUserActive: (id: string, currentStatus: boolean) => Promise<void>;
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  isLoading: false,
  fetchUsers: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      set({ users: data, isLoading: false });
    } catch (error) {
      console.error('Fetch users error:', error);
      set({ isLoading: false });
    }
  },
  addUser: async (user) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, active: true }),
      });
      const newUser = await response.json();
      set((state) => ({ users: [newUser, ...state.users] }));
      toast.success('تم إضافة المستخدم بنجاح');
    } catch (error) {
      console.error('Add user error:', error);
      toast.error('فشل في إضافة المستخدم');
    }
  },
  updateUser: async (id, data) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update user');
      const updatedUser = await response.json();
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? updatedUser : u)),
      }));
      toast.success('تم تحديث بيانات المستخدم بنجاح');
    } catch (error) {
      console.error('Update user error:', error);
      toast.error('فشل في تحديث بيانات المستخدم');
    }
  },
  toggleUserActive: async (id, currentStatus) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentStatus }),
      });
      const updatedUser = await response.json();
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? updatedUser : u)),
      }));
      toast.success(currentStatus ? 'تم تعطيل المستخدم' : 'تم تفعيل المستخدم');
    } catch (error) {
      console.error('Toggle user active error:', error);
      toast.error('فشل في تغيير حالة المستخدم');
    }
  },
}));
