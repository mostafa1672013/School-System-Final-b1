import {
  calculateChangeDifference,
  calculatePartialSubscription,
  calculateCancellationRefund,
} from '@/lib/proRata';

describe('ProRata Calculator', () => {
  const yearEnd = new Date('2027-06-30');

  test('route change — student pays additional 800 EGP', () => {
    const result = calculateChangeDifference({
      previousFullFee: 6000,
      previousDiscountPct: 0,
      newFullFee: 8000,
      newDiscountPct: 0,
      changeEffectiveDate: new Date('2027-02-15'),
      academicYearEnd: yearEnd,
    });
    expect(result.monthsRemaining).toBe(4);
    expect(result.proportion).toBeCloseTo(0.4);
    expect(result.previousRemaining).toBe(2400);
    expect(result.newRemaining).toBe(3200);
    expect(result.difference).toBe(800);
    expect(result.direction).toBe('subscriber_pays');
  });

  test('employee cancellation — 1800 EGP refund', () => {
    const refund = calculateCancellationRefund({
      netFeePaid: 3000,
      cancellationDate: new Date('2027-01-01'),
      academicYearEnd: yearEnd,
    });
    expect(refund).toBe(1800);
  });

  test('new student joins mid-year — 4800 EGP', () => {
    const fee = calculatePartialSubscription({
      fullAnnualFee: 6000,
      discountPct: 0,
      startDate: new Date('2026-11-01'),
      academicYearEnd: yearEnd,
    });
    expect(fee).toBe(4800);
  });

  test('supervisor always pays 0', () => {
    const fee = calculatePartialSubscription({
      fullAnnualFee: 6000,
      discountPct: 100,
      startDate: new Date('2026-11-01'),
      academicYearEnd: yearEnd,
    });
    expect(fee).toBe(0);
  });

  test('no months remaining returns 0', () => {
    const result = calculateChangeDifference({
      previousFullFee: 6000,
      previousDiscountPct: 0,
      newFullFee: 8000,
      newDiscountPct: 0,
      changeEffectiveDate: new Date('2027-07-01'),
      academicYearEnd: yearEnd,
    });
    expect(result.monthsRemaining).toBe(0);
    expect(result.difference).toBe(0);
    expect(result.direction).toBe('no_change');
  });

  test('cancellation with admin fee reduces refund', () => {
    const refund = calculateCancellationRefund({
      netFeePaid: 3000,
      cancellationDate: new Date('2027-01-01'),
      academicYearEnd: new Date('2027-06-30'),
      cancellationFee: 200,
    });
    // 1800 refund minus 200 cancellation fee = 1600
    expect(refund).toBe(1600);
  });
});
