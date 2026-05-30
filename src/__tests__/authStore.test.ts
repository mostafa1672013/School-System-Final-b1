import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore, getAuthHeaders } from '@/stores/authStore';

// Mock the fetch API
const globalFetch = global.fetch;

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  describe('login', () => {
    it('successfully logs in and updates state', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@example.com', role: 'admin' };
      const mockToken = 'fake-jwt-token';
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ user: mockUser, token: mockToken }),
      });

      // Mock dynamic imports used in the store
      vi.mock('@/stores/settingsStore', () => ({
        useSettingsStore: {
          getState: () => ({ fetchAcademicYear: vi.fn() }),
        },
      }));

      const result = await useAuthStore.getState().login('test@example.com', 'password123');

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(mockToken);
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.any(Object));
    });

    it('returns false and handles 403 (inactive account)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });

      const result = await useAuthStore.getState().login('test@example.com', 'password123');

      expect(result).toBe(false);
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it('returns false on invalid credentials (401)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      const result = await useAuthStore.getState().login('test@example.com', 'wrongpassword');

      expect(result).toBe(false);
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('returns false on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await useAuthStore.getState().login('test@example.com', 'password123');

      expect(result).toBe(false);
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears state and calls logout endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      
      // Set initial state
      useAuthStore.setState({
        user: { id: '1', name: 'Test', role: 'admin' } as any,
        token: 'valid-token',
        isAuthenticated: true,
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', expect.any(Object));
    });
  });

  describe('updateProfile', () => {
    it('returns false if not authenticated', async () => {
      const result = await useAuthStore.getState().updateProfile({ name: 'New Name' });
      expect(result).toBe(false);
    });

    it('successfully updates profile and updates state', async () => {
      const initialUser = { id: '1', name: 'Old Name', role: 'admin' };
      const updatedUser = { id: '1', name: 'New Name', role: 'admin' };
      
      useAuthStore.setState({
        user: initialUser as any,
        token: 'valid-token',
        isAuthenticated: true,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(updatedUser),
      });

      const result = await useAuthStore.getState().updateProfile({ name: 'New Name' });

      expect(result).toBe(true);
      expect(useAuthStore.getState().user).toEqual(updatedUser);
      expect(global.fetch).toHaveBeenCalledWith('/api/users/1', expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          'Authorization': 'Bearer valid-token'
        })
      }));
    });

    it('returns false on update failure', async () => {
      useAuthStore.setState({
        user: { id: '1', name: 'Test', role: 'admin' } as any,
        token: 'valid-token',
        isAuthenticated: true,
      });

      global.fetch = vi.fn().mockResolvedValue({ ok: false });

      const result = await useAuthStore.getState().updateProfile({ name: 'New Name' });

      expect(result).toBe(false);
      expect(useAuthStore.getState().user?.name).toBe('Test'); // Should remain unchanged
    });
  });

  describe('getAuthHeaders', () => {
    it('returns only Content-Type when unauthenticated', () => {
      useAuthStore.setState({ token: null });
      
      const headers = getAuthHeaders();
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
      expect(headers).not.toHaveProperty('Authorization');
    });

    it('includes Authorization header when authenticated', () => {
      useAuthStore.setState({ token: 'my-secret-token' });
      
      const headers = getAuthHeaders();
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer my-secret-token',
      });
    });
  });
});
