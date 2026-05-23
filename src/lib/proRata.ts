export interface ProRataResult {
  monthsRemaining: number;
  totalMonths: number;
  proportion: number;
  previousRemaining: number;
  newRemaining: number;
  difference: number;
  direction: 'subscriber_pays' | 'school_refunds' | 'no_change';
}

const DEFAULT_ACADEMIC_MONTHS = 10;

function calculateMonthsRemaining(fromDate: Date, toDate: Date): number {
  if (fromDate >= toDate) return 0;
  let months = (toDate.getFullYear() - fromDate.getFullYear()) * 12
    + (toDate.getMonth() - fromDate.getMonth());
  if (fromDate.getDate() === 1) {
    months += 1;
  } else if (fromDate.getDate() > toDate.getDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

export function calculateChangeDifference(params: {
  previousFullFee: number;
  previousDiscountPct: number;
  newFullFee: number;
  newDiscountPct: number;
  changeEffectiveDate: Date;
  academicYearEnd: Date;
  totalMonths?: number;
}): ProRataResult {
  const {
    previousFullFee, previousDiscountPct,
    newFullFee, newDiscountPct,
    changeEffectiveDate, academicYearEnd,
    totalMonths = DEFAULT_ACADEMIC_MONTHS,
  } = params;

  const previousNet = previousFullFee * (100 - previousDiscountPct) / 100;
  const newNet = newFullFee * (100 - newDiscountPct) / 100;

  const monthsRemaining = calculateMonthsRemaining(changeEffectiveDate, academicYearEnd);
  const proportion = totalMonths > 0 ? monthsRemaining / totalMonths : 0;

  const previousRemaining = Math.round(previousNet * proportion * 100) / 100;
  const newRemaining = Math.round(newNet * proportion * 100) / 100;
  const difference = Math.round((newRemaining - previousRemaining) * 100) / 100;

  return {
    monthsRemaining,
    totalMonths,
    proportion,
    previousRemaining,
    newRemaining,
    difference,
    direction: difference > 0 ? 'subscriber_pays' : difference < 0 ? 'school_refunds' : 'no_change',
  };
}

export function calculatePartialSubscription(params: {
  fullAnnualFee: number;
  discountPct: number;
  startDate: Date;
  academicYearEnd: Date;
  totalMonths?: number;
}): number {
  const { fullAnnualFee, discountPct, startDate, academicYearEnd, totalMonths = DEFAULT_ACADEMIC_MONTHS } = params;
  const netAnnual = fullAnnualFee * (100 - discountPct) / 100;
  const months = calculateMonthsRemaining(startDate, academicYearEnd);
  const proportion = totalMonths > 0 ? months / totalMonths : 0;
  return Math.round(netAnnual * proportion * 100) / 100;
}

export function calculateCancellationRefund(params: {
  netFeePaid: number;
  cancellationDate: Date;
  academicYearEnd: Date;
  cancellationFee?: number;
  totalMonths?: number;
}): number {
  const { netFeePaid, cancellationDate, academicYearEnd, cancellationFee = 0, totalMonths = DEFAULT_ACADEMIC_MONTHS } = params;
  const months = calculateMonthsRemaining(cancellationDate, academicYearEnd);
  const proportion = totalMonths > 0 ? months / totalMonths : 0;
  const refund = Math.round(netFeePaid * proportion * 100) / 100;
  return Math.max(0, refund - cancellationFee);
}
