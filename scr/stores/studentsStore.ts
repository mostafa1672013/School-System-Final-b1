import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Student } from '@/types';
import { mockStudents } from '@/constants/mockData';
import { generateId } from '@/lib/utils';

interface StudentsState {
  students: Student[];
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  getStudent: (id: string) => Student | undefined;
  addPaymentToStudent: (id: string, amount: number) => void;
}

export const useStudentsStore = create<StudentsState>()(
  persist(
    (set, get) => ({
      students: mockStudents,
      addStudent: (student) => set((state) => ({
        students: [...state.students, { ...student, id: generateId() }],
      })),
      updateStudent: (id, data) => set((state) => ({
        students: state.students.map((s) => s.id === id ? { ...s, ...data } : s),
      })),
      deleteStudent: (id) => set((state) => ({
        students: state.students.filter((s) => s.id !== id),
      })),
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
