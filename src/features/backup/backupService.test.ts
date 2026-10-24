import { describe, it, expect, beforeEach } from 'vitest';
import { validateBackupData, restoreBackupData } from './backupService';
import { MockStorage } from '../../test/mockStorage';
import { BackupData } from '../../types/storage';

describe('Backup and Recovery Service', () => {
  let storage: MockStorage;

  const validBackup: BackupData = {
    schemaVersion: 1,
    exportedAt: '2026-10-24T12:00:00.000Z',
    settings: {
      defaultAttendanceTarget: 75,
      activeSemesterId: 'sem-1',
      theme: 'light',
      weekStartsOn: 1,
    },
    semesters: [
      {
        id: 'sem-1',
        name: 'Fall 2026',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    subjects: [
      {
        id: 'sub-math',
        semesterId: 'sem-1',
        name: 'Mathematics',
        subjectCode: 'MATH101',
        attendanceTarget: 75,
        trackingMode: 'daily',
        totalClassesHeld: 10,
        totalClassesAttended: 8,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    attendanceRecords: [
      {
        id: 'rec-1',
        subjectId: 'sub-math',
        date: '2026-10-20',
        classesHeld: 2,
        classesAttended: 2,
        createdAt: '2026-10-20T10:00:00.000Z',
        updatedAt: '2026-10-20T10:00:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    storage = new MockStorage();
  });

  describe('validateBackupData', () => {
    it('validates a correct backup object and returns accurate summary', () => {
      const result = validateBackupData(validBackup);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.summary).toEqual({
        schemaVersion: 1,
        exportedAt: '2026-10-24T12:00:00.000Z',
        semesterCount: 1,
        subjectCount: 1,
        recordCount: 1,
      });
    });

    it('rejects non-object or null input', () => {
      expect(validateBackupData(null).isValid).toBe(false);
      expect(validateBackupData('string').isValid).toBe(false);
      expect(validateBackupData([]).isValid).toBe(false);
    });

    it('rejects missing or unsupported schema version', () => {
      const missingVersion = { ...validBackup, schemaVersion: undefined };
      expect(validateBackupData(missingVersion).isValid).toBe(false);

      const futureVersion = { ...validBackup, schemaVersion: 99 };
      const res = validateBackupData(futureVersion);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Unsupported backup schema version');
    });

    it('rejects missing entity arrays', () => {
      const missingSemesters = { ...validBackup, semesters: undefined };
      expect(validateBackupData(missingSemesters).isValid).toBe(false);

      const missingSubjects = { ...validBackup, subjects: undefined };
      expect(validateBackupData(missingSubjects).isValid).toBe(false);

      const missingRecords = { ...validBackup, attendanceRecords: undefined };
      expect(validateBackupData(missingRecords).isValid).toBe(false);
    });

    it('rejects subjects with non-existent semesterId (broken referential integrity)', () => {
      const brokenSubject = {
        ...validBackup,
        subjects: [
          {
            id: 'sub-orphan',
            semesterId: 'non-existent-sem',
            name: 'Physics',
            attendanceTarget: 75,
            trackingMode: 'daily',
            totalClassesHeld: 0,
            totalClassesAttended: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      };
      const res = validateBackupData(brokenSubject);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('references non-existent semester ID');
    });

    it('rejects attendance records with non-existent subjectId', () => {
      const brokenRecord = {
        ...validBackup,
        attendanceRecords: [
          {
            id: 'rec-orphan',
            subjectId: 'non-existent-subject',
            date: '2026-10-20',
            classesHeld: 1,
            classesAttended: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      };
      const res = validateBackupData(brokenRecord);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('references non-existent subject ID');
    });

    it('rejects attendance records where classesAttended exceeds classesHeld', () => {
      const invalidCounts = {
        ...validBackup,
        attendanceRecords: [
          {
            id: 'rec-err',
            subjectId: 'sub-math',
            date: '2026-10-20',
            classesHeld: 1,
            classesAttended: 2, // invalid
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      };
      const res = validateBackupData(invalidCounts);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('exceeding classesHeld');
    });
  });

  describe('restoreBackupData', () => {
    it('restores backup data into storage atomically upon successful validation', async () => {
      const summary = await restoreBackupData(validBackup, storage);
      expect(summary.semesterCount).toBe(1);
      expect(summary.subjectCount).toBe(1);
      expect(summary.recordCount).toBe(1);

      const semesters = await storage.getSemesters();
      expect(semesters.length).toBe(1);
      expect(semesters[0]?.name).toBe('Fall 2026');

      const subjects = await storage.getSubjects();
      expect(subjects.length).toBe(1);
      expect(subjects[0]?.name).toBe('Mathematics');
    });

    it('throws error and does not mutate storage when backup is invalid', async () => {
      const invalidData = { schemaVersion: 99 } as unknown as BackupData;
      await expect(restoreBackupData(invalidData, storage)).rejects.toThrow(
        'Unsupported backup schema version'
      );
    });
  });
});
