import { describe, it, expect } from 'vitest';
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateShort,
  generateId,
  roleLabels,
  paymentTypeLabels,
  paymentMethodLabels,
  stageLabels,
  trackLabels,
  statusLabels,
  gradeOptions,
  academicYears,
  currentAcademicYear,
} from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// 1. cn — Class name merge utility
// ═══════════════════════════════════════════════════════
describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('deduplicates tailwind classes', () => {
    const result = cn('p-2', 'p-4');
    expect(result).toBe('p-4');
  });

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('handles undefined and null inputs', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });
});

// ═══════════════════════════════════════════════════════
// 2. formatCurrency — Egyptian currency formatting
// ═══════════════════════════════════════════════════════
describe('formatCurrency', () => {
  it('formats a positive number', () => {
    const result = formatCurrency(5000);
    // Should contain the number 5000 in some form and the Egyptian currency symbol
    expect(result).toContain('٥٬٠٠٠');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('٠');
  });

  it('returns 0 ج.م. for undefined', () => {
    expect(formatCurrency(undefined)).toBe('0 ج.م.');
  });

  it('returns 0 ج.م. for null', () => {
    expect(formatCurrency(null)).toBe('0 ج.م.');
  });

  it('returns 0 ج.م. for NaN input', () => {
    expect(formatCurrency(NaN)).toBe('0 ج.م.');
  });

  it('formats negative numbers', () => {
    const result = formatCurrency(-1000);
    expect(result).toBeTruthy();
    expect(result).not.toBe('0 ج.م.');
  });

  it('formats large numbers', () => {
    const result = formatCurrency(1000000);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(3);
  });
});

// ═══════════════════════════════════════════════════════
// 3. formatDate — Long Arabic date format
// ═══════════════════════════════════════════════════════
describe('formatDate', () => {
  it('formats a valid date string', () => {
    const result = formatDate('2024-06-15');
    expect(result).not.toBe('-');
    expect(result.length).toBeGreaterThan(3);
  });

  it('returns dash for undefined', () => {
    expect(formatDate(undefined)).toBe('-');
  });

  it('returns dash for null', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('returns dash for empty string', () => {
    expect(formatDate('')).toBe('-');
  });

  it('returns dash for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('-');
  });
});

// ═══════════════════════════════════════════════════════
// 4. formatDateShort — Short Arabic date format
// ═══════════════════════════════════════════════════════
describe('formatDateShort', () => {
  it('formats a valid date string', () => {
    const result = formatDateShort('2024-06-15');
    expect(result).not.toBe('-');
  });

  it('returns dash for undefined', () => {
    expect(formatDateShort(undefined)).toBe('-');
  });

  it('returns dash for null', () => {
    expect(formatDateShort(null)).toBe('-');
  });

  it('returns dash for invalid date', () => {
    expect(formatDateShort('invalid')).toBe('-');
  });
});

// ═══════════════════════════════════════════════════════
// 5. generateId — Unique ID generator
// ═══════════════════════════════════════════════════════
describe('generateId', () => {
  it('returns a non-empty string', () => {
    const id = generateId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('returns a string of reasonable length', () => {
    const id = generateId();
    expect(id.length).toBeGreaterThan(5);
    expect(id.length).toBeLessThan(30);
  });
});

// ═══════════════════════════════════════════════════════
// 6. Label mappings — verify all keys are present
// ═══════════════════════════════════════════════════════
describe('roleLabels', () => {
  const expectedRoles = [
    'system_admin',
    'school_director',
    'head_accountant',
    'accountant',
    'warehouse_keeper',
    'bus_supervisor',
  ];

  it('has labels for all defined roles', () => {
    for (const role of expectedRoles) {
      expect(roleLabels[role]).toBeTruthy();
    }
  });

  it('all labels are non-empty Arabic strings', () => {
    for (const label of Object.values(roleLabels)) {
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe('paymentTypeLabels', () => {
  const expectedTypes = ['tuition', 'books', 'uniform', 'bus', 'activities', 'other', 'arrears', 'application_fee'];

  it('has labels for all payment types', () => {
    for (const type of expectedTypes) {
      expect(paymentTypeLabels[type]).toBeTruthy();
    }
  });
});

describe('paymentMethodLabels', () => {
  const expectedMethods = ['cash', 'bank_transfer', 'wallet'];

  it('has labels for all payment methods', () => {
    for (const method of expectedMethods) {
      expect(paymentMethodLabels[method]).toBeTruthy();
    }
  });
});

describe('stageLabels', () => {
  const expectedStages = ['kg', 'primary', 'preparatory', 'secondary'];

  it('has labels for all stages', () => {
    for (const stage of expectedStages) {
      expect(stageLabels[stage]).toBeTruthy();
    }
  });
});

describe('trackLabels', () => {
  it('has labels for local and international tracks', () => {
    expect(trackLabels.local).toBeTruthy();
    expect(trackLabels.international).toBeTruthy();
  });
});

describe('statusLabels', () => {
  const expectedStatuses = [
    'applied', 'under_testing', 'failed', 'fee_setup',
    'pending_approval', 'admitted', 'pending_discount',
    'inactive', 'graduated', 'transferred',
  ];

  it('has labels for all student statuses', () => {
    for (const status of expectedStatuses) {
      expect(statusLabels[status]).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════════════════
// 7. gradeOptions — Grade options per stage
// ═══════════════════════════════════════════════════════
describe('gradeOptions', () => {
  it('has grades for KG stage', () => {
    expect(gradeOptions.kg).toHaveLength(2);
    expect(gradeOptions.kg).toContain('KG1');
    expect(gradeOptions.kg).toContain('KG2');
  });

  it('has 6 grades for primary stage', () => {
    expect(gradeOptions.primary).toHaveLength(6);
  });

  it('has 3 grades for preparatory stage', () => {
    expect(gradeOptions.preparatory).toHaveLength(3);
  });

  it('has 3 grades for secondary stage', () => {
    expect(gradeOptions.secondary).toHaveLength(3);
  });

  it('all grade arrays contain non-empty strings', () => {
    for (const grades of Object.values(gradeOptions)) {
      for (const grade of grades) {
        expect(grade.length).toBeGreaterThan(0);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════
// 8. Academic years
// ═══════════════════════════════════════════════════════
describe('academicYears', () => {
  it('is a non-empty array', () => {
    expect(academicYears.length).toBeGreaterThan(0);
  });

  it('all entries match YYYY-YYYY format', () => {
    for (const year of academicYears) {
      expect(year).toMatch(/^\d{4}-\d{4}$/);
    }
  });

  it('currentAcademicYear is included in the list', () => {
    expect(academicYears).toContain(currentAcademicYear);
  });
});
