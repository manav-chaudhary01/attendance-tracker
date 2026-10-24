export type SemesterStatus = 'active' | 'archived';

export interface Semester {
  id: string;
  name: string;
  academicYear?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  status: SemesterStatus;
  createdAt: string;  // ISO 8601
  archivedAt?: string; // ISO 8601
}

export type CreateSemesterInput = Omit<Semester, 'id' | 'createdAt' | 'archivedAt'>;
export type UpdateSemesterInput = Partial<Omit<Semester, 'id' | 'createdAt'>>;
