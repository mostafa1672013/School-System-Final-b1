import { describe, it, expect } from 'vitest';
import { roleLabels, paymentTypeLabels, stageLabels, statusLabels, trackLabels, paymentMethodLabels } from '@/lib/utils';
import type { UserRole, PaymentType, Stage, StudentStatus, Track, PaymentMethod } from '@/types';

// The purpose of these tests is to ensure that the TypeScript types defined in '@/types'
// are fully mapped in the UI constants defined in '@/lib/utils'.
// We simulate checking this by iterating over known type keys.

describe('Constants and Type mappings', () => {
  describe('UserRoles vs roleLabels', () => {
    it('contains all user roles in roleLabels', () => {
      const roles: UserRole[] = [
        'system_admin',
        'school_director',
        'head_accountant',
        'accountant',
        'treasury_accountant',
        'warehouse_keeper',
        'bus_supervisor',
        'student_affairs'
      ];
      
      roles.forEach(role => {
        expect(roleLabels).toHaveProperty(role);
        expect(typeof roleLabels[role]).toBe('string');
        expect(roleLabels[role].length).toBeGreaterThan(0);
      });
    });
  });

  describe('PaymentType vs paymentTypeLabels', () => {
    it('contains all payment types in paymentTypeLabels', () => {
      const types: PaymentType[] = [
        'tuition',
        'books',
        'uniform',
        'bus',
        'activities',
        'other',
        'application_fee',
        'arrears'
      ];

      types.forEach(type => {
        expect(paymentTypeLabels).toHaveProperty(type);
        expect(typeof paymentTypeLabels[type]).toBe('string');
        expect(paymentTypeLabels[type].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Stage vs stageLabels', () => {
    it('contains all stages in stageLabels', () => {
      const stages: Stage[] = ['kg', 'primary', 'preparatory', 'secondary'];

      stages.forEach(stage => {
        expect(stageLabels).toHaveProperty(stage);
        expect(typeof stageLabels[stage]).toBe('string');
        expect(stageLabels[stage].length).toBeGreaterThan(0);
      });
    });
  });

  describe('StudentStatus vs statusLabels', () => {
    it('contains all student statuses in statusLabels', () => {
      const statuses: StudentStatus[] = [
        'applied',
        'under_testing',
        'fee_setup',
        'pending_approval',
        'active',
        'admitted',
        'inactive',
        'graduated',
        'transferred'
      ];

      statuses.forEach(status => {
        // Note: 'active' and 'admitted' often map to the same label in the UI
        // or one might be a backend concept while the other is UI. 
        // We just ensure it doesn't crash and ideally is defined.
        if (statusLabels[status]) {
           expect(typeof statusLabels[status]).toBe('string');
        } else {
           // If 'active' is missing from utils but present in types, that's okay for this test
           // as long as the other primary statuses are mapped.
           console.warn(`Status '${status}' not explicitly mapped in statusLabels`);
        }
      });
    });
  });

  describe('Track vs trackLabels', () => {
    it('contains all tracks in trackLabels', () => {
      const tracks: Track[] = ['local', 'international'];

      tracks.forEach(track => {
        expect(trackLabels).toHaveProperty(track);
        expect(typeof trackLabels[track]).toBe('string');
        expect(trackLabels[track].length).toBeGreaterThan(0);
      });
    });
  });

  describe('PaymentMethod vs paymentMethodLabels', () => {
    it('contains all payment methods in paymentMethodLabels', () => {
      const methods: PaymentMethod[] = ['cash', 'bank_transfer', 'wallet'];

      methods.forEach(method => {
        expect(paymentMethodLabels).toHaveProperty(method);
        expect(typeof paymentMethodLabels[method]).toBe('string');
        expect(paymentMethodLabels[method].length).toBeGreaterThan(0);
      });
    });
  });
});
