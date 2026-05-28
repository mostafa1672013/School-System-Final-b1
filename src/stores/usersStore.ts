import { getAuthHeaders } from './authStore';
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
  deleteUser: (id: string) => Promise<void>;
  changePassword: (id: string, password: string) => Promise<void>;
  updateUserStatus: (userId: string, isOnline: boolean, lastLogoutAt: Date | null) => void;
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  isLoading: false,
  fetchUsers: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/users', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      set({ users: data, isLoading: false });
    } catch (error) {
      console.error('Fetch users error:', error);
      set({ isLoading: false });
      toast.error('فشل في تحميل المستخدمين');
    }
  },
  addUser: async (user) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...user, active: true }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add user');
      }
      const newUser = await response.json();
      set((state) => ({ users: [newUser, ...state.users] }));
      toast.success('تم إضافة المستخدم بنجاح');
    } catch (error: any) {
      console.error('Add user error:', error);
      toast.error(error.message || 'فشل في إضافة المستخدم');
    }
  },
  updateUser: async (id, data) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
  deleteUser: async (id) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete user');
      set((state) => ({
        users: state.users.filter((u) => u.id !== id),
      }));
      toast.success('تم حذف المستخدم بنجاح');
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('فشل في حذف المستخدم');
    }
  },
  changePassword: async (id, password) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ password }),
      });
      if (!response.ok) throw new Error('Failed to change password');
      toast.success('تم تغيير كلمة المرور بنجاح');
    } catch (error) {
      console.error('Change password error:', error);
      toast.error('فشل في تغيير كلمة المرور');
    }
  },
  updateUserStatus: (userId, isOnline, lastLogoutAt) => {
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, isOnline, lastLogoutAt } : u
      ),
    }));
  },
}));
