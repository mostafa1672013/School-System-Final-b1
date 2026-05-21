import { getAuthHeaders } from './authStore';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Student } from '@/types';
import { mockStudents } from '@/constants/mockData';
import { generateId } from '@/lib/utils';

interface StudentsState {
  students: Student[];
  isLoading: boolean;
  fetchStudents: () => Promise<void>;
  addStudent: (student: Omit<Student, 'id'>) => Promise<void>;
  updateStudent: (id: string, data: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  getStudent: (id: string) => Student | undefined;
  addPaymentToStudent: (id: string, amount: number) => void;
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
          const data = await response.json();
          set({ students: data, isLoading: false });
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
          throw error; // Rethrow to let the UI know it failed
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
      addPaymentToStudent: (id, amount) => set((state) => ({
        students: state.students.map((s) =>
          s.id === id ? { ...s, paidAmount: s.paidAmount + amount } : s
        ),
      })),
    }),
    { name: 'school-students' }
  )
);
