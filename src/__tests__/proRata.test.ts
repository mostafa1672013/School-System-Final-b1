import { describe, test, expect } from 'vitest';
import {
  calculateChangeDifference,
  calculatePartialSubscription,
  calculateCancellationRefund,
} from '@/lib/proRata';

describe('ProRata Calculator', () => {
  const yearEnd = new Date('2027-06-30');

  // ═══════════════════════════════════════════════════════
  // calculateChangeDifference
  // ═══════════════════════════════════════════════════════
  describe('calculateChangeDifference', () => {
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

    test('downgrade — school refunds difference', () => {
      const result = calculateChangeDifference({
        previousFullFee: 8000,
        previousDiscountPct: 0,
        newFullFee: 6000,
        newDiscountPct: 0,
        changeEffectiveDate: new Date('2027-02-15'),
        academicYearEnd: yearEnd,
      });
      expect(result.difference).toBe(-800);
      expect(result.direction).toBe('school_refunds');
    });

    test('same fee — no change', () => {
      const result = calculateChangeDifference({
        previousFullFee: 6000,
        previousDiscountPct: 0,
        newFullFee: 6000,
        newDiscountPct: 0,
        changeEffectiveDate: new Date('2027-02-15'),
        academicYearEnd: yearEnd,
      });
      expect(result.difference).toBe(0);
      expect(result.direction).toBe('no_change');
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

    test('change with discount on new fee', () => {
      const result = calculateChangeDifference({
        previousFullFee: 6000,
        previousDiscountPct: 0,
        newFullFee: 8000,
        newDiscountPct: 50,
        changeEffectiveDate: new Date('2027-02-15'),
        academicYearEnd: yearEnd,
      });
      // newNet = 4000, previousNet = 6000
      // proportion = 0.4
      // newRemaining = 1600, previousRemaining = 2400
      expect(result.newRemaining).toBe(1600);
      expect(result.difference).toBe(-800);
      expect(result.direction).toBe('school_refunds');
    });

    test('change from 1st of the month counts full month', () => {
      const result = calculateChangeDifference({
        previousFullFee: 6000,
        previousDiscountPct: 0,
        newFullFee: 8000,
        newDiscountPct: 0,
        changeEffectiveDate: new Date('2027-03-01'),
        academicYearEnd: yearEnd,
      });
      // From March 1 to June 30: 4 months (March, April, May, June)
      expect(result.monthsRemaining).toBe(4);
    });

    test('custom totalMonths parameter', () => {
      const result = calculateChangeDifference({
        previousFullFee: 6000,
        previousDiscountPct: 0,
        newFullFee: 8000,
        newDiscountPct: 0,
        changeEffectiveDate: new Date('2027-02-15'),
        academicYearEnd: yearEnd,
        totalMonths: 12,
      });
      expect(result.totalMonths).toBe(12);
      expect(result.proportion).toBeCloseTo(4 / 12);
    });

    test('both fees with discounts', () => {
      const result = calculateChangeDifference({
        previousFullFee: 6000,
        previousDiscountPct: 10,
        newFullFee: 8000,
        newDiscountPct: 20,
        changeEffectiveDate: new Date('2027-02-15'),
        academicYearEnd: yearEnd,
      });
      // previousNet = 5400, newNet = 6400
      // proportion = 0.4
      const expectedDiff = Math.round((6400 * 0.4 - 5400 * 0.4) * 100) / 100;
      expect(result.difference).toBe(expectedDiff);
    });
  });

  // ═══════════════════════════════════════════════════════
  // calculatePartialSubscription
  // ═══════════════════════════════════════════════════════
  describe('calculatePartialSubscription', () => {
    test('new student joins mid-year — 4800 EGP', () => {
      const fee = calculatePartialSubscription({
        fullAnnualFee: 6000,
        discountPct: 0,
        startDate: new Date('2026-11-01'),
        academicYearEnd: yearEnd,
      });
      expect(fee).toBe(4800);
    });

    test('supervisor always pays 0 (100% discount)', () => {
      const fee = calculatePartialSubscription({
        fullAnnualFee: 6000,
        discountPct: 100,
        startDate: new Date('2026-11-01'),
        academicYearEnd: yearEnd,
      });
      expect(fee).toBe(0);
    });

    test('full year subscription from Sep 1', () => {
      const fee = calculatePartialSubscription({
        fullAnnualFee: 6000,
        discountPct: 0,
        startDate: new Date('2026-09-01'),
        academicYearEnd: yearEnd,
      });
      // Sep 1 to June 30 = 10 months
      expect(fee).toBe(6000);
    });

    test('join after year end returns 0', () => {
      const fee = calculatePartialSubscription({
        fullAnnualFee: 6000,
        discountPct: 0,
        startDate: new Date('2027-08-01'),
        academicYearEnd: yearEnd,
      });
      expect(fee).toBe(0);
    });

    test('partial discount applied correctly', () => {
      const fee = calculatePartialSubscription({
        fullAnnualFee: 10000,
        discountPct: 20,
        startDate: new Date('2027-01-01'),
        academicYearEnd: yearEnd,
      });
      // netAnnual = 8000, months = 6, proportion = 0.6
      expect(fee).toBe(4800);
    });
  });

  // ═══════════════════════════════════════════════════════
  // calculateCancellationRefund
  // ═══════════════════════════════════════════════════════
  describe('calculateCancellationRefund', () => {
    test('employee cancellation — 1800 EGP refund', () => {
      const refund = calculateCancellationRefund({
        netFeePaid: 3000,
        cancellationDate: new Date('2027-01-01'),
        academicYearEnd: yearEnd,
      });
      expect(refund).toBe(1800);
    });

    test('cancellation with admin fee reduces refund', () => {
      const refund = calculateCancellationRefund({
        netFeePaid: 3000,
        cancellationDate: new Date('2027-01-01'),
        academicYearEnd: new Date('2027-06-30'),
        cancellationFee: 200,
      });
      expect(refund).toBe(1600);
    });

    test('cancellation fee exceeding refund returns 0', () => {
      const refund = calculateCancellationRefund({
        netFeePaid: 500,
        cancellationDate: new Date('2027-05-01'),
        academicYearEnd: yearEnd,
        cancellationFee: 1000,
      });
      expect(refund).toBe(0);
    });

    test('cancellation after year end returns 0', () => {
      const refund = calculateCancellationRefund({
        netFeePaid: 3000,
        cancellationDate: new Date('2027-08-01'),
        academicYearEnd: yearEnd,
      });
      expect(refund).toBe(0);
    });

    test('cancellation on same date as year end returns 0', () => {
      const refund = calculateCancellationRefund({
        netFeePaid: 3000,
        cancellationDate: new Date('2027-06-30'),
        academicYearEnd: yearEnd,
      });
      expect(refund).toBe(0);
    });

    test('full year remaining returns full refund', () => {
      const refund = calculateCancellationRefund({
        netFeePaid: 6000,
        cancellationDate: new Date('2026-09-01'),
        academicYearEnd: yearEnd,
      });
      // 10 months remaining / 10 total = full refund
      expect(refund).toBe(6000);
    });
  });
});
