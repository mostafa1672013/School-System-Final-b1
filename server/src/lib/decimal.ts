import { Prisma } from '@prisma/client';

export function toNumber(d: Prisma.Decimal | null | undefined): number {
  if (d == null) return 0;
  return d.toNumber();
}

export function toDecimal(n: number | string): Prisma.Decimal {
  return new Prisma.Decimal(n);
}

export function serializeDecimals<T>(obj: T): T {
  if (obj instanceof Prisma.Decimal) return obj.toNumber() as unknown as T;
  if (obj instanceof Date) return obj as unknown as T;
  if (Array.isArray(obj)) return obj.map(serializeDecimals) as unknown as T;
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, serializeDecimals(v)])
    ) as T;
  }
  return obj;
}
