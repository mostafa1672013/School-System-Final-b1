/**
 * Typed TanStack Query hooks for paginated list endpoints.
 *
 * Each hook accepts page/pageSize/filter params and returns the standard
 * PaginatedResult envelope { data, page, pageSize, total, totalPages }.
 * Cache keys include all params so each page+filter combo is cached
 * independently (src/lib/query-client.ts handles staleTime + gcTime).
 *
 * Legacy callers that don't pass `page` still work via the Zustand stores —
 * no breaking change.
 *
 * Usage:
 *   const { data } = usePaginatedStudents({ page: 1, pageSize: 50, academicYear: '2025-2026' });
 *   const students = data?.data ?? [];
 *   const totalPages = data?.totalPages ?? 1;
 */
import { useQuery } from '@tanstack/react-query';
import { getAuthHeaders } from '@/stores/authStore';
import { staleTimes } from '@/lib/query-client';

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ── Generic fetcher ────────────────────────────────────────────────────────

async function fetchPaginated<T>(
  url: string,
  params: object,
): Promise<PaginatedResult<T>> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}${qs.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ── Students ───────────────────────────────────────────────────────────────

export interface StudentListParams {
  page: number;
  pageSize?: number;
  status?: string;
  /** Comma-separated list of statuses (filters via `in`); takes precedence over `status`. */
  statuses?: string;
  stage?: string;
  grade?: string;
  academicYear?: string;
  search?: string;
  paymentRequestStatus?: string;
}

export function usePaginatedStudents(params: StudentListParams) {
  return useQuery({
    queryKey: ['students', 'paginated', params] as const,
    queryFn: () => fetchPaginated<unknown>('/api/students', params),
    staleTime: staleTimes.list,
  });
}

// ── Payments ───────────────────────────────────────────────────────────────

export interface PaymentListParams {
  page: number;
  pageSize?: number;
  studentId?: string;
  type?: string;
  academicYear?: string;
  sessionId?: string;
  from?: string;
  to?: string;
  search?: string;
}

export function usePaginatedPayments(params: PaymentListParams) {
  return useQuery({
    queryKey: ['payments', 'paginated', params] as const,
    queryFn: () => fetchPaginated<unknown>('/api/payments', params),
    staleTime: staleTimes.live, // financial data — always fresh
  });
}

// ── Inventory items ────────────────────────────────────────────────────────

export interface InventoryItemListParams {
  page: number;
  pageSize?: number;
  category?: string;
  grade?: string;
  itemType?: string;
  search?: string;
}

export function usePaginatedInventoryItems(params: InventoryItemListParams) {
  return useQuery({
    queryKey: ['inventory', 'items', 'paginated', params] as const,
    queryFn: () => fetchPaginated<unknown>('/api/inventory', params),
    staleTime: staleTimes.list,
  });
}

// ── Inventory transactions ─────────────────────────────────────────────────

export interface InventoryTxListParams {
  page: number;
  pageSize?: number;
  itemId?: string;
  type?: string;
  subType?: string;
  studentId?: string;
  from?: string;
  to?: string;
}

export function usePaginatedInventoryTx(params: InventoryTxListParams) {
  return useQuery({
    queryKey: ['inventory', 'transactions', 'paginated', params] as const,
    queryFn: () => fetchPaginated<unknown>('/api/inventory/transactions', params),
    staleTime: staleTimes.list,
  });
}

// ── Delivery orders ────────────────────────────────────────────────────────

export interface DeliveryOrderListParams {
  page: number;
  pageSize?: number;
  status?: string;
  studentId?: string;
  academicYear?: string;
  term?: string;
}

export function usePaginatedDeliveryOrders(params: DeliveryOrderListParams) {
  return useQuery({
    queryKey: ['delivery-orders', 'paginated', params] as const,
    queryFn: () => fetchPaginated<unknown>('/api/delivery-orders', params),
    staleTime: staleTimes.list,
  });
}
