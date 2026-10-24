import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../test/mockStorage';
import {
  createSubject,
  updateSubject,
  deleteSubject,
  validateSubjectInput,
} from './subjectService';

describe('Subject Service', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  describe('Validation', () => {
    it('requires a subject name and semesterId', () => {
      const errors = validateSubjectInput({ name: '  ', attendanceTarget: 75 });
      expect(errors.some((e) => e.field === 'name')).toBe(true);
      expect(errors.some((e) => e.field === 'semesterId')).toBe(true);
    });

    it('rejects duplicate subject names within the same semester', () => {
      const existing = [
        {
          id: 's1',
          semesterId: 'sem-1',
          name: 'Computer Networks',
          attendanceTarget: 75,
          trackingMode: 'daily' as const,
          totalClassesHeld: 0,
          totalClassesAttended: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const errors = validateSubjectInput(
        { semesterId: 'sem-1', name: 'computer networks', attendanceTarget: 75 },
        existing
      );
      expect(errors.some((e) => e.field === 'name')).toBe(true);
      expect(errors.find((e) => e.field === 'name')?.message).toContain('already exists in this semester');
    });

    it('allows identical subject names in different semesters', () => {
      // In semester 2, Computer Networks is valid even if it was taken in semester 1
      const existingInSemester2: any[] = [];
      const errors = validateSubjectInput(
        { semesterId: 'sem-2', name: 'Computer Networks', attendanceTarget: 75 },
        existingInSemester2
      );
      expect(errors).toHaveLength(0);
    });

    it('validates target percentage range [0, 100]', () => {
      expect(
        validateSubjectInput({ semesterId: 'sem-1', name: 'Math', attendanceTarget: -10 })
      ).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'attendanceTarget' })]));

      expect(
        validateSubjectInput({ semesterId: 'sem-1', name: 'Math', attendanceTarget: 105 })
      ).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'attendanceTarget' })]));
    });

    it('ensures classes attended cannot exceed classes held', () => {
      const errors = validateSubjectInput({
        semesterId: 'sem-1',
        name: 'Math',
        attendanceTarget: 75,
        totalClassesHeld: 10,
        totalClassesAttended: 12,
      });

      expect(errors.some((e) => e.field === 'totalClassesAttended')).toBe(true);
      expect(errors.find((e) => e.field === 'totalClassesAttended')?.message).toContain('cannot exceed');
    });
  });

  describe('CRUD & Semester Isolation', () => {
    it('creates subjects and strictly isolates them by semester', async () => {
      const sub1 = await createSubject(
        {
          semesterId: 'sem-1',
          name: 'Physics',
          subjectCode: 'PHY101',
          attendanceTarget: 80,
          trackingMode: 'daily',
          totalClassesHeld: 20,
          totalClassesAttended: 18,
        },
        storage
      );

      const sub2 = await createSubject(
        {
          semesterId: 'sem-2',
          name: 'Chemistry',
          subjectCode: 'CHM101',
          attendanceTarget: 75,
          trackingMode: 'manual',
          totalClassesHeld: 15,
          totalClassesAttended: 12,
        },
        storage
      );

      const sem1Subjects = await storage.getSubjects('sem-1');
      expect(sem1Subjects).toHaveLength(1);
      expect(sem1Subjects[0]?.id).toBe(sub1.id);

      const sem2Subjects = await storage.getSubjects('sem-2');
      expect(sem2Subjects).toHaveLength(1);
      expect(sem2Subjects[0]?.id).toBe(sub2.id);
    });

    it('updates subject details and targets', async () => {
      const sub = await createSubject(
        {
          semesterId: 'sem-1',
          name: 'Algorithms',
          attendanceTarget: 75,
          trackingMode: 'daily',
          totalClassesHeld: 0,
          totalClassesAttended: 0,
        },
        storage
      );

      const updated = await updateSubject(
        sub.id,
        {
          name: 'Advanced Algorithms',
          subjectCode: 'CS301',
          attendanceTarget: 85,
        },
        storage
      );

      expect(updated.name).toBe('Advanced Algorithms');
      expect(updated.subjectCode).toBe('CS301');
      expect(updated.attendanceTarget).toBe(85);
    });

    it('deletes subject without affecting other subjects', async () => {
      const sub1 = await createSubject(
        {
          semesterId: 'sem-1',
          name: 'Calculus',
          attendanceTarget: 75,
          trackingMode: 'daily',
          totalClassesHeld: 0,
          totalClassesAttended: 0,
        },
        storage
      );
      const sub2 = await createSubject(
        {
          semesterId: 'sem-1',
          name: 'Linear Algebra',
          attendanceTarget: 75,
          trackingMode: 'daily',
          totalClassesHeld: 0,
          totalClassesAttended: 0,
        },
        storage
      );

      await deleteSubject(sub1.id, storage);

      const remaining = await storage.getSubjects('sem-1');
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.id).toBe(sub2.id);
    });
  });
});
