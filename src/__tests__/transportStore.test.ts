import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTransportStore } from '@/stores/transportStore';

const globalFetch = global.fetch;

const mockCompany = { id: 'comp-1', name: 'Fast Buses' };
const mockContract = { id: 'cont-1', companyId: 'comp-1', amount: 5000 };
const mockBus = { id: 'bus-1', code: 'BUS-01', rentalContractId: 'cont-1' };
const mockDriver = { id: 'drv-1', name: 'John Doe', companyId: 'comp-1' };

describe('Transport Store', () => {
  beforeEach(() => {
    useTransportStore.setState({
      companies: [],
      contracts: [],
      buses: [],
      drivers: [],
      isLoading: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  describe('fetchAll', () => {
    it('fetches all transport data in parallel', async () => {
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/rental-companies') return Promise.resolve({ json: () => [mockCompany] });
        if (url === '/api/rental-contracts') return Promise.resolve({ json: () => [mockContract] });
        if (url === '/api/buses') return Promise.resolve({ json: () => [mockBus] });
        if (url === '/api/external-drivers') return Promise.resolve({ json: () => [mockDriver] });
        return Promise.resolve({ json: () => [] });
      });

      await useTransportStore.getState().fetchAll();

      const state = useTransportStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.companies).toHaveLength(1);
      expect(state.contracts).toHaveLength(1);
      expect(state.buses).toHaveLength(1);
      expect(state.drivers).toHaveLength(1);
    });

    it('handles failure gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      await useTransportStore.getState().fetchAll();
      expect(useTransportStore.getState().companies).toHaveLength(0);
    });
  });

  describe('add functions', () => {
    it('addCompany success', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockCompany) });
      await useTransportStore.getState().addCompany({} as any);
      expect(useTransportStore.getState().companies).toHaveLength(1);
    });

    it('addContract success', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockContract) });
      await useTransportStore.getState().addContract({} as any);
      expect(useTransportStore.getState().contracts).toHaveLength(1);
    });

    it('addBus success', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockBus) });
      await useTransportStore.getState().addBus({} as any);
      expect(useTransportStore.getState().buses).toHaveLength(1);
    });

    it('addDriver success', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockDriver) });
      await useTransportStore.getState().addDriver({} as any);
      expect(useTransportStore.getState().drivers).toHaveLength(1);
    });
  });

  describe('update functions', () => {
    it('updateCompany success', async () => {
      useTransportStore.setState({ companies: [mockCompany] as any });
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ...mockCompany, name: 'Updated' }) });
      await useTransportStore.getState().updateCompany('comp-1', { name: 'Updated' });
      expect(useTransportStore.getState().companies[0].name).toBe('Updated');
    });

    it('updateContract success', async () => {
      useTransportStore.setState({ contracts: [mockContract] as any });
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ...mockContract, amount: 6000 }) });
      await useTransportStore.getState().updateContract('cont-1', { amount: 6000 });
      expect(useTransportStore.getState().contracts[0].amount).toBe(6000);
    });

    it('updateBus success', async () => {
      useTransportStore.setState({ buses: [mockBus] as any });
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ...mockBus, code: 'BUS-02' }) });
      await useTransportStore.getState().updateBus('bus-1', { code: 'BUS-02' } as any);
      expect(useTransportStore.getState().buses[0].code).toBe('BUS-02');
    });
  });
});
