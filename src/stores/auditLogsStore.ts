import { create } from 'zustand';
import { toast } from 'sonner';
import { getAuthHeaders } from './authStore';
import type { AuditLogsResponse } from '@/types';

interface AuditLogsState {
  data: AuditLogsResponse | null;
  isLoading: boolean;
  fetchLogs: (filters?: { page?: number; entityType?: string; userId?: string; entityId?: string }) => Promise<void>;
}

export const useAuditLogsStore = create<AuditLogsState>((set) => ({
  data: null,
  isLoading: false,
  fetchLogs: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const queryParams = new URLSearchParams();
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.entityType && filters.entityType !== 'all') queryParams.append('entityType', filters.entityType);
      if (filters.userId && filters.userId !== 'all') queryParams.append('userId', filters.userId);
      if (filters.entityId) queryParams.append('entityId', filters.entityId);

      const response = await fetch(`/api/audit?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      set({ data, isLoading: false });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('فشل في تحميل سجلات النظام');
      set({ isLoading: false });
    }
  },
}));
