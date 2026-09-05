import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../test/mockStorage';
import {
  createSemester,
  updateSemester,
  archiveSemester,
  unarchiveSemester,
  deleteSemester,
  setActiveSemester,
  validateSemesterInput,
} from './semesterService';

describe('Semester Service', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  describe('Validation', () => {
    it('requires a non-empty name', () => {
      const errors = validateSemesterInput({ name: '   ' });
      expect(errors).toHaveLength(1);
      expect(errors[0]?.field).toBe('name');
      expect(errors[0]?.message).toContain('required');
    });

    it('rejects duplicate names within existing semesters', () => {
      const existing = [
        {
          id: '1',
          name: 'Fall 2026',
          status: 'active' as const,
          createdAt: new Date().toISOString(),
        },
      ];
      const errors = validateSemesterInput({ name: 'fall 2026' }, existing);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('already exists');
    });

    it('validates start and end date ordering', () => {
      const errors = validateSemesterInput({
        name: 'Spring 2027',
        startDate: '2027-06-01',
        endDate: '2027-01-01',
      });
      expect(errors.some((e) => e.field === 'endDate')).toBe(true);
      expect(errors.find((e) => e.field === 'endDate')?.message).toContain('earlier than start date');
    });

    it('allows valid semester inputs', () => {
      const errors = validateSemesterInput({
        name: 'Fall 2026',
        academicYear: '2026-2027',
        startDate: '2026-08-01',
        endDate: '2026-12-15',
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('CRUD Operations and Lifecycle', () => {
    it('creates semester and makes it active if it is the first semester', async () => {
      const semester = await createSemester(
        {
          name: 'Fall 2026',
          academicYear: '2026-2027',
          status: 'active',
        },
        storage
      );

      expect(semester.id).toBeDefined();
      expect(semester.name).toBe('Fall 2026');

      const settings = await storage.getSettings();
      expect(settings.activeSemesterId).toBe(semester.id);
    });

    it('updates semester details while preserving ID', async () => {
      const sem = await createSemester({ name: 'Term 1', status: 'active' }, storage);
      const updated = await updateSemester(
        sem.id,
        { name: 'Term 1 Updated', academicYear: '2026' },
        storage
      );

      expect(updated.id).toBe(sem.id);
      expect(updated.name).toBe('Term 1 Updated');
      expect(updated.academicYear).toBe('2026');
    });

    it('archives an active semester and reassigns activeSemesterId if another active exists', async () => {
      const sem1 = await createSemester({ name: 'Fall 2026', status: 'active' }, storage, { makeActive: true });
      const sem2 = await createSemester({ name: 'Spring 2027', status: 'active' }, storage, { makeActive: false });

      // sem1 is currently active
      const settingsBefore = await storage.getSettings();
      expect(settingsBefore.activeSemesterId).toBe(sem1.id);

      // Archive sem1
      const archived = await archiveSemester(sem1.id, storage);
      expect(archived.status).toBe('archived');
      expect(archived.archivedAt).toBeDefined();

      // Active semester should now switch to sem2
      const settingsAfter = await storage.getSettings();
      expect(settingsAfter.activeSemesterId).toBe(sem2.id);
    });

    it('unarchives a semester and can restore it as active', async () => {
      const sem = await createSemester({ name: 'Fall 2026', status: 'active' }, storage);
      await archiveSemester(sem.id, storage);

      const restored = await unarchiveSemester(sem.id, storage, true);
      expect(restored.status).toBe('active');
      expect(restored.archivedAt).toBeUndefined();

      const settings = await storage.getSettings();
      expect(settings.activeSemesterId).toBe(restored.id);
    });

    it('deletes semester and removes all its subjects and records', async () => {
      const sem = await createSemester({ name: 'Fall 2026', status: 'active' }, storage);

      // Add a subject to this semester
      await storage.saveSubject({
        id: 'sub-1',
        semesterId: sem.id,
        name: 'Math',
        attendanceTarget: 75,
        trackingMode: 'daily',
        totalClassesHeld: 10,
        totalClassesAttended: 8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Add a record
      await storage.saveAttendanceRecord({
        id: 'rec-1',
        subjectId: 'sub-1',
        date: '2026-09-01',
        classesHeld: 1,
        classesAttended: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await deleteSemester(sem.id, storage);

      expect(await storage.getSemester(sem.id)).toBeUndefined();
      expect(await storage.getSubjects(sem.id)).toHaveLength(0);
      expect(await storage.getAttendanceRecords('sub-1')).toHaveLength(0);
    });

    it('allows explicit active semester switching', async () => {
      await createSemester({ name: 'Sem 1', status: 'active' }, storage);
      const sem2 = await createSemester({ name: 'Sem 2', status: 'active' }, storage, { makeActive: false });

      await setActiveSemester(sem2.id, storage);

      const settings = await storage.getSettings();
      expect(settings.activeSemesterId).toBe(sem2.id);
    });
  });
});
