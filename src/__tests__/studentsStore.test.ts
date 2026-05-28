import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStudentsStore } from '@/stores/studentsStore';
import type { Student } from '@/types';

const globalFetch = global.fetch;

// Mock initial data
const mockStudent: Student = {
  id: '1',
  nationalId: '12345678901234',
  name: 'Test Student',
  stage: 'primary',
  grade: 'الصف الأول الابتدائي',
  track: 'local',
  academicYear: '2023-2024',
  guardianName: 'Test Guardian',
  guardianPhone: '01000000000',
  status: 'active',
  hasSiblings: false,
  tuitionFees: 5000,
  booksFees: 1000,
  uniformFees: 500,
  busFees: 0,
  otherFees: 0,
  arrearsFees: 0,
  totalFees: 6500,
  paidAmount: 2000,
  discountAmount: 0,
  discountPercentage: 0,
  discountStatus: 'approved',
};

describe('Students Store', () => {
  beforeEach(() => {
    useStudentsStore.setState({
      students: [],
      isLoading: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  describe('fetchStudents', () => {
    it('fetches students and updates state', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockStudent]),
      });

      await useStudentsStore.getState().fetchStudents();

      const state = useStudentsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.students).toHaveLength(1);
      expect(state.students[0]).toEqual(mockStudent);
    });

    it('handles fetch failure gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await useStudentsStore.getState().fetchStudents();

      const state = useStudentsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.students).toHaveLength(0); // Should remain empty
    });

    it('handles unexpected response formats', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ notAnArray: true }),
      });

      await useStudentsStore.getState().fetchStudents();

      const state = useStudentsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.students).toHaveLength(0);
    });
  });

  describe('addStudent', () => {
    it('adds a new student to the store', async () => {
      const newStudentInfo = { ...mockStudent, id: undefined }; // Remove ID for creation
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStudent),
      });

      await useStudentsStore.getState().addStudent(newStudentInfo as Omit<Student, 'id'>);

      const state = useStudentsStore.getState();
      expect(state.students).toHaveLength(1);
      expect(state.students[0]).toEqual(mockStudent);
      expect(global.fetch).toHaveBeenCalledWith('/api/students', expect.objectContaining({ method: 'POST' }));
    });
  });

  describe('updateStudent', () => {
    it('updates an existing student', async () => {
      useStudentsStore.setState({ students: [mockStudent] });
      const updatedMockStudent = { ...mockStudent, name: 'Updated Name' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(updatedMockStudent),
      });

      await useStudentsStore.getState().updateStudent('1', { name: 'Updated Name' });

      const state = useStudentsStore.getState();
      expect(state.students[0].name).toBe('Updated Name');
      expect(global.fetch).toHaveBeenCalledWith('/api/students/1', expect.objectContaining({ method: 'PATCH' }));
    });

    it('throws error if update fails', async () => {
      useStudentsStore.setState({ students: [mockStudent] });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      await expect(useStudentsStore.getState().updateStudent('1', { name: 'Updated' })).rejects.toThrow();
      
      // Store should remain unchanged
      expect(useStudentsStore.getState().students[0].name).toBe('Test Student');
    });
  });

  describe('deleteStudent', () => {
    it('removes a student from the store', async () => {
      useStudentsStore.setState({ students: [mockStudent] });

      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      await useStudentsStore.getState().deleteStudent('1');

      const state = useStudentsStore.getState();
      expect(state.students).toHaveLength(0);
      expect(global.fetch).toHaveBeenCalledWith('/api/students/1', expect.objectContaining({ method: 'DELETE' }));
    });
  });

  describe('getStudent', () => {
    it('finds student by id', () => {
      useStudentsStore.setState({ students: [mockStudent] });
      
      const found = useStudentsStore.getState().getStudent('1');
      expect(found).toEqual(mockStudent);
    });

    it('returns undefined for non-existent student', () => {
      useStudentsStore.setState({ students: [mockStudent] });
      
      const found = useStudentsStore.getState().getStudent('999');
      expect(found).toBeUndefined();
    });
  });

  describe('addPaymentToStudent', () => {
    it('increases paid amount for regular payments', () => {
      useStudentsStore.setState({ students: [mockStudent] });
      // initial paidAmount is 2000
      
      useStudentsStore.getState().addPaymentToStudent('1', 500, 'tuition');
      
      const updated = useStudentsStore.getState().getStudent('1');
      expect(updated?.paidAmount).toBe(2500);
      expect(updated?.status).toBe('active'); // status shouldn't change for tuition
    });

    it('does not increase paid amount but updates status for application_fee', () => {
      useStudentsStore.setState({ students: [{...mockStudent, status: 'applied', paidAmount: 0}] });
      
      useStudentsStore.getState().addPaymentToStudent('1', 500, 'application_fee');
      
      const updated = useStudentsStore.getState().getStudent('1');
      expect(updated?.paidAmount).toBe(0); // application fees don't count towards tuition balance
      expect(updated?.status).toBe('under_testing');
    });
  });

  describe('promoteStudent', () => {
    it('successfully promotes a student', async () => {
      useStudentsStore.setState({ students: [mockStudent] });
      
      const promotionData = {
        toStage: 'primary' as const,
        toGrade: 'الصف الثاني الابتدائي',
        toAcademicYear: '2024-2025',
        tuitionFees: 6000,
        booksFees: 1200,
        uniformFees: 600,
        busFees: 0,
        otherFees: 0,
        arrearsFees: 4500, // old total(6500) - old paid(2000)
        discountAmount: 0,
        discountPercentage: 0,
        totalFees: 12300,
        status: 'active' as const,
      };

      const updatedStudent = {
        ...mockStudent,
        stage: promotionData.toStage,
        grade: promotionData.toGrade,
        academicYear: promotionData.toAcademicYear,
        tuitionFees: promotionData.tuitionFees,
        booksFees: promotionData.booksFees,
        uniformFees: promotionData.uniformFees,
        busFees: promotionData.busFees,
        otherFees: promotionData.otherFees,
        arrearsFees: promotionData.arrearsFees,
        totalFees: promotionData.totalFees,
        paidAmount: 0, // Should be reset
        status: promotionData.status,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(updatedStudent),
      });

      await useStudentsStore.getState().promoteStudent('1', promotionData);

      const state = useStudentsStore.getState();
      expect(state.students[0].grade).toBe('الصف الثاني الابتدائي');
      expect(state.students[0].academicYear).toBe('2024-2025');
      expect(state.students[0].arrearsFees).toBe(4500);
      expect(state.students[0].paidAmount).toBe(0);
    });

    it('throws on promotion failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Server validation error' }),
      });

      await expect(useStudentsStore.getState().promoteStudent('1', {} as any)).rejects.toThrow('Server validation error');
    });
  });

  describe('bulkPromoteStudents', () => {
    it('returns succeeded and failed counts correctly', async () => {
      const p1 = { studentId: '1', toStage: 'primary', toGrade: 'G2', toAcademicYear: '2024-2025', tuitionFees: 0, booksFees: 0, uniformFees: 0, busFees: 0, otherFees: 0, arrearsFees: 0, discountAmount: 0, discountPercentage: 0, totalFees: 0, status: 'active' as const };
      const p2 = { studentId: '2', toStage: 'primary', toGrade: 'G2', toAcademicYear: '2024-2025', tuitionFees: 0, booksFees: 0, uniformFees: 0, busFees: 0, otherFees: 0, arrearsFees: 0, discountAmount: 0, discountPercentage: 0, totalFees: 0, status: 'active' as const };
      
      // Mock get().promoteStudent directly for testing the bulk method loop
      const store = useStudentsStore.getState();
      const promoteSpy = vi.fn()
        .mockResolvedValueOnce(undefined) // First succeeds
        .mockRejectedValueOnce(new Error('Failed')); // Second fails

      // Temporarily override the promoteStudent function for this test
      useStudentsStore.setState({ promoteStudent: promoteSpy });

      const result = await useStudentsStore.getState().bulkPromoteStudents([p1, p2]);

      expect(result).toEqual({ succeeded: 1, failed: 1 });
      expect(promoteSpy).toHaveBeenCalledTimes(2);
    });
  });
});
