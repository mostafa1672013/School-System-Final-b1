// server/src/__tests__/financial.test.ts
import { Prisma } from '@prisma/client';
import { toNumber, toDecimal, serializeDecimals } from '../lib/decimal';

describe('Decimal helpers', () => {
  it('toNumber converts Decimal correctly', () => {
    expect(toNumber(new Prisma.Decimal('1234.56'))).toBe(1234.56);
  });

  it('toNumber returns 0 for null', () => {
    expect(toNumber(null)).toBe(0);
  });

  it('toNumber returns 0 for undefined', () => {
    expect(toNumber(undefined)).toBe(0);
  });

  it('toDecimal avoids float precision issues', () => {
    // Native float: 0.1 + 0.2 = 0.30000000000000004
    const result = toDecimal('0.1').plus(toDecimal('0.2'));
    expect(result.toFixed(2)).toBe('0.30');
  });

  it('serializeDecimals converts top-level Decimal', () => {
    const input = new Prisma.Decimal('100.50');
    expect(serializeDecimals(input)).toBe(100.50);
  });

  it('serializeDecimals converts nested Decimal objects', () => {
    const input = { amount: new Prisma.Decimal('100.50'), nested: { fee: new Prisma.Decimal('25.00') } };
    const result = serializeDecimals(input);
    expect(result.amount).toBe(100.50);
    expect(result.nested.fee).toBe(25.00);
  });

  it('serializeDecimals handles arrays', () => {
    const input = [{ amount: new Prisma.Decimal('10.00') }, { amount: new Prisma.Decimal('20.00') }];
    const result = serializeDecimals(input);
    expect(result[0].amount).toBe(10.00);
    expect(result[1].amount).toBe(20.00);
  });

  it('serializeDecimals preserves Date objects', () => {
    const date = new Date('2026-01-01');
    const input = { createdAt: date, amount: new Prisma.Decimal('50.00') };
    const result = serializeDecimals(input);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.amount).toBe(50.00);
  });

  it('serializeDecimals handles null and primitives', () => {
    expect(serializeDecimals(null)).toBeNull();
    expect(serializeDecimals('hello')).toBe('hello');
    expect(serializeDecimals(42)).toBe(42);
    expect(serializeDecimals(true)).toBe(true);
  });
});

describe('Fee calculation correctness with Decimal', () => {
  it('discount percentage applied correctly avoids float error', () => {
    const tuitionFees = new Prisma.Decimal('15000');
    const discountPct  = new Prisma.Decimal('33.33');
    const discountAmt  = tuitionFees.mul(discountPct).div(100).toDecimalPlaces(2);
    expect(discountAmt.toFixed(2)).toBe('4999.50');
  });

  it('total fees = sum of individual fees', () => {
    const fees = ['3000', '500', '750', '1200'].map(f => new Prisma.Decimal(f));
    const total = fees.reduce((sum, f) => sum.plus(f), new Prisma.Decimal(0));
    expect(total.toFixed(2)).toBe('5450.00');
  });

  it('remaining balance = totalFees - paidAmount', () => {
    const total = new Prisma.Decimal('15000');
    const paid  = new Prisma.Decimal('7500.50');
    const remaining = total.minus(paid);
    expect(remaining.toFixed(2)).toBe('7499.50');
  });

  it('zero discount produces no change to total', () => {
    const total = new Prisma.Decimal('10000');
    const discountPct = new Prisma.Decimal('0');
    const afterDiscount = total.minus(total.mul(discountPct).div(100));
    expect(afterDiscount.toFixed(2)).toBe('10000.00');
  });

  it('100% discount results in zero', () => {
    const total = new Prisma.Decimal('10000');
    const discountPct = new Prisma.Decimal('100');
    const afterDiscount = total.minus(total.mul(discountPct).div(100));
    expect(afterDiscount.toFixed(2)).toBe('0.00');
  });
});
