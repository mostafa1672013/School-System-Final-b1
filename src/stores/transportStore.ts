import { create } from 'zustand';
import { toast } from 'sonner';
import { getAuthHeaders } from './authStore';
import type { RentalCompany, RentalContract, FleetBus, ExternalDriver } from '@/types';

interface TransportState {
  companies: RentalCompany[];
  contracts: RentalContract[];
  buses: FleetBus[];
  drivers: ExternalDriver[];
  isLoading: boolean;
  fetchAll: () => Promise<void>;
  addCompany: (data: Omit<RentalCompany, 'id' | 'code' | 'createdAt' | 'updatedAt' | '_count'>) => Promise<void>;
  updateCompany: (id: string, data: Partial<RentalCompany>) => Promise<void>;
  addContract: (data: Omit<RentalContract, 'id' | 'createdAt' | 'updatedAt' | '_count' | 'company'>) => Promise<void>;
  updateContract: (id: string, data: Partial<RentalContract>) => Promise<void>;
  addBus: (data: Omit<FleetBus, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'rentalContract'>) => Promise<void>;
  updateBus: (id: string, data: Partial<FleetBus>) => Promise<void>;
  addDriver: (data: Omit<ExternalDriver, 'id' | 'code' | 'createdAt' | 'company'>) => Promise<void>;
}

export const useTransportStore = create<TransportState>()((set) => ({
  companies: [],
  contracts: [],
  buses: [],
  drivers: [],
  isLoading: false,

  fetchAll: async () => {
    set({ isLoading: true });
    try {
      const [companies, contracts, buses, drivers] = await Promise.all([
        fetch('/api/rental-companies', { headers: getAuthHeaders() }).then((r) => r.json()),
        fetch('/api/rental-contracts', { headers: getAuthHeaders() }).then((r) => r.json()),
        fetch('/api/buses', { headers: getAuthHeaders() }).then((r) => r.json()),
        fetch('/api/external-drivers', { headers: getAuthHeaders() }).then((r) => r.json()),
      ]);
      set({ companies, contracts, buses, drivers, isLoading: false });
    } catch {
      set({ isLoading: false });
      toast.error('فشل تحميل بيانات الأسطول');
    }
  },

  addCompany: async (data) => {
    try {
      const res = await fetch('/api/rental-companies', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const company = await res.json();
      set((s) => ({ companies: [...s.companies, company] }));
      toast.success('تم إضافة شركة التأجير');
    } catch {
      toast.error('فشل إضافة الشركة');
    }
  },

  updateCompany: async (id, data) => {
    try {
      const res = await fetch(`/api/rental-companies/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      set((s) => ({ companies: s.companies.map((c) => (c.id === id ? updated : c)) }));
    } catch {
      toast.error('فشل تحديث بيانات الشركة');
    }
  },

  addContract: async (data) => {
    try {
      const res = await fetch('/api/rental-contracts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const contract = await res.json();
      set((s) => ({ contracts: [...s.contracts, contract] }));
      toast.success('تم إضافة العقد');
    } catch {
      toast.error('فشل إضافة العقد');
    }
  },

  updateContract: async (id, data) => {
    try {
      const res = await fetch(`/api/rental-contracts/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      set((s) => ({ contracts: s.contracts.map((c) => (c.id === id ? updated : c)) }));
    } catch {
      toast.error('فشل تحديث العقد');
    }
  },

  addBus: async (data) => {
    try {
      const res = await fetch('/api/buses', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const bus = await res.json();
      set((s) => ({ buses: [...s.buses, bus] }));
      toast.success(`تم إضافة الباص ${bus.code}`);
    } catch {
      toast.error('فشل إضافة الباص');
    }
  },

  updateBus: async (id, data) => {
    try {
      const res = await fetch(`/api/buses/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      set((s) => ({ buses: s.buses.map((b) => (b.id === id ? updated : b)) }));
    } catch {
      toast.error('فشل تحديث الباص');
    }
  },

  addDriver: async (data) => {
    try {
      const res = await fetch('/api/external-drivers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const driver = await res.json();
      set((s) => ({ drivers: [...s.drivers, driver] }));
      toast.success('تم إضافة السائق');
    } catch {
      toast.error('فشل إضافة السائق');
    }
  },
}));
