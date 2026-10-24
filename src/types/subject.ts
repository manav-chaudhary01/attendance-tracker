export type TrackingMode = 'daily' | 'manual';

export interface Subject {
  id: string;
  semesterId: string;
  name: string;
  subjectCode?: string;
  attendanceTarget: number; // e.g. 75 for 75%
  trackingMode: TrackingMode;
  totalClassesHeld: number;
  totalClassesAttended: number;
  initialClassesHeld?: number;
  initialClassesAttended?: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  archivedAt?: string; // ISO 8601
}

export type CreateSubjectInput = Omit<Subject, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>;
export type UpdateSubjectInput = Partial<Omit<Subject, 'id' | 'createdAt' | 'semesterId'>>;
