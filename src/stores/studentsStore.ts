import { getAuthHeaders } from './authStore';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Student, Stage } from '@/types';

interface StudentsState {
  students: Student[];
  isLoading: boolean;
  fetchStudents: () => Promise<void>;
  addStudent: (student: Omit<Student, 'id'>) => Promise<void>;
  updateStudent: (id: string, data: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  getStudent: (id: string) => Student | undefined;
  addPaymentToStudent: (id: string, amount: number, paymentType?: string) => void;
  promoteStudent: (id: string, data: {
    toStage: Stage;
    toGrade: string;
    toAcademicYear: string;
    tuitionFees: number;
    booksFees: number;
    uniformFees: number;
    busFees: number;
    otherFees: number;
    arrearsFees: number;
    discountAmount: number;
    discountPercentage: number;
    totalFees: number;
    status: import('@/types').StudentStatus;
  }) => Promise<void>;
  bulkPromoteStudents: (promotions: Array<{
    studentId: string;
    toStage: Stage;
    toGrade: string;
    toAcademicYear: string;
    tuitionFees: number;
    booksFees: number;
    uniformFees: number;
    busFees: number;
    otherFees: number;
    arrearsFees: number;
    discountAmount: number;
    discountPercentage: number;
    totalFees: number;
    status: import('@/types').StudentStatus;
  }>) => Promise<{ succeeded: number; failed: number }>;
}

export const useStudentsStore = create<StudentsState>()(
  persist(
    (set, get) => ({
      students: [],
      isLoading: false,
      fetchStudents: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/students', { headers: getAuthHeaders() });
          if (!response.ok) {
            console.error('Failed to fetch students:', response.status);
            set({ isLoading: false });
            return;
          }
          const data = await response.json();
          if (Array.isArray(data)) {
            set({ students: data, isLoading: false });
          } else {
            console.error('Expected array of students but got:', data);
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Fetch students error:', error);
          set({ isLoading: false });
        }
      },
      addStudent: async (student) => {
        try {
          const response = await fetch('/api/students', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(student),
          });
          const newStudent = await response.json();
          set((state) => ({ students: [newStudent, ...state.students] }));
        } catch (error) {
          console.error('Add student error:', error);
        }
      },
      updateStudent: async (id, data) => {
        try {
          const response = await fetch(`/api/students/${id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          });
          if (!response.ok) throw new Error('Failed to update student on server');
          const updatedStudent = await response.json();
          set((state) => ({
            students: state.students.map((s) => s.id === id ? updatedStudent : s),
          }));
        } catch (error) {
          console.error('Update student error:', error);
          throw error;
        }
      },
      deleteStudent: async (id) => {
        try {
          await fetch(`/api/students/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          set((state) => ({
            students: state.students.filter((s) => s.id !== id),
          }));
        } catch (error) {
          console.error('Delete student error:', error);
        }
      },
      getStudent: (id) => get().students.find((s) => s.id === id),
      addPaymentToStudent: (id, amount, paymentType) => set((state) => ({
        students: state.students.map((s) =>
          s.id === id
            ? {
                ...s,
                paidAmount: paymentType !== 'application_fee' ? s.paidAmount + amount : s.paidAmount,
                ...(paymentType === 'application_fee' && { status: 'under_testing' as const }),
              }
            : s
        ),
      })),
      promoteStudent: async (id, data) => {
        let response: Response;
        try {
          response = await fetch(`/api/students/${id}/promote`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              stage: data.toStage,
              grade: data.toGrade,
              academicYear: data.toAcademicYear,
              tuitionFees: data.tuitionFees,
              booksFees: data.booksFees,
              uniformFees: data.uniformFees,
              busFees: data.busFees,
              otherFees: data.otherFees,
              arrearsFees: data.arrearsFees,
              discountAmount: data.discountAmount,
              discountPercentage: data.discountPercentage,
              totalFees: data.totalFees,
              status: data.status,
            }),
          });
        } catch {
          throw new Error('خطأ في الاتصال بالخادم');
        }
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'فشل النقل');
        }
        const updated = await response.json();
        set((state) => ({
          students: state.students.map((s) => (s.id === id ? updated : s)),
        }));
      },
      bulkPromoteStudents: async (promotions) => {
        let succeeded = 0;
        let failed = 0;
        for (const p of promotions) {
          try {
            await get().promoteStudent(p.studentId, p);
            succeeded++;
          } catch (err) {
            console.error(`Bulk promote failed for student ${p.studentId}:`, err);
            failed++;
          }
        }
        return { succeeded, failed };
      },
    }),
    { name: 'school-students' }
  )
);
