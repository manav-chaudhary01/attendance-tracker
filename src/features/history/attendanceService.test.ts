import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../test/mockStorage';
import {
  saveDailyAttendanceSession,
  getDailyAttendanceForDate,
  syncSubjectTotals,
  DailyAttendanceEntry,
} from './attendanceService';
import { getTodayLocalDateString, addDays } from '../../utils/dates';

describe('Daily Attendance Service', () => {
  let storage: MockStorage;
  const semesterId = 'sem-1';
  const today = getTodayLocalDateString();
  const yesterday = addDays(today, -1);

  beforeEach(async () => {
    storage = new MockStorage();

    // Create semester
    await storage.saveSemester({
      id: semesterId,
      name: 'Fall 2026',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    // Create 2 daily subjects and 1 manual subject
    await storage.saveSubject({
      id: 'sub-math',
      semesterId,
      name: 'Mathematics',
      attendanceTarget: 75,
      trackingMode: 'daily',
      totalClassesHeld: 0,
      totalClassesAttended: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await storage.saveSubject({
      id: 'sub-cs',
      semesterId,
      name: 'Computer Science',
      attendanceTarget: 80,
      trackingMode: 'daily',
      totalClassesHeld: 0,
      totalClassesAttended: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await storage.saveSubject({
      id: 'sub-manual',
      semesterId,
      name: 'Workshop Lab',
      attendanceTarget: 75,
      trackingMode: 'manual',
      totalClassesHeld: 10,
      totalClassesAttended: 9,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  describe('Basic Attendance Entry (Present, Absent, No Class)', () => {
    it('records attendance for multiple subjects on today date and updates subject aggregates', async () => {
      const entries: DailyAttendanceEntry[] = [
        { subjectId: 'sub-math', classesHeld: 1, classesAttended: 1 }, // Present
        { subjectId: 'sub-cs', classesHeld: 1, classesAttended: 0 },   // Absent
      ];

      const res = await saveDailyAttendanceSession(semesterId, today, entries, storage);
      expect(res.savedCount).toBe(2);

      // Verify records in storage
      const mathRecord = await storage.getAttendanceRecordBySubjectAndDate('sub-math', today);
      expect(mathRecord).toBeDefined();
      expect(mathRecord?.classesHeld).toBe(1);
      expect(mathRecord?.classesAttended).toBe(1);

      const csRecord = await storage.getAttendanceRecordBySubjectAndDate('sub-cs', today);
      expect(csRecord).toBeDefined();
      expect(csRecord?.classesHeld).toBe(1);
      expect(csRecord?.classesAttended).toBe(0);

      // Verify updated subject aggregate totals
      const mathSub = await storage.getSubject('sub-math');
      expect(mathSub?.totalClassesHeld).toBe(1);
      expect(mathSub?.totalClassesAttended).toBe(1);

      const csSub = await storage.getSubject('sub-cs');
      expect(csSub?.totalClassesHeld).toBe(1);
      expect(csSub?.totalClassesAttended).toBe(0);
    });

    it('does not create records when classesHeld is 0 (No Class)', async () => {
      const entries: DailyAttendanceEntry[] = [
        { subjectId: 'sub-math', classesHeld: 0, classesAttended: 0 },
      ];

      const res = await saveDailyAttendanceSession(semesterId, today, entries, storage);
      expect(res.savedCount).toBe(0);
      expect(res.clearedCount).toBe(0);

      const mathRecord = await storage.getAttendanceRecordBySubjectAndDate('sub-math', today);
      expect(mathRecord).toBeUndefined();

      const mathSub = await storage.getSubject('sub-math');
      expect(mathSub?.totalClassesHeld).toBe(0);
    });
  });

  describe('Multiple Classes on the Same Day', () => {
    it('supports multiple held classes (e.g. double lab) on one date', async () => {
      const entries: DailyAttendanceEntry[] = [
        { subjectId: 'sub-cs', classesHeld: 3, classesAttended: 2 }, // Attended 2 of 3 classes
      ];

      await saveDailyAttendanceSession(semesterId, today, entries, storage);

      const csRecord = await storage.getAttendanceRecordBySubjectAndDate('sub-cs', today);
      expect(csRecord?.classesHeld).toBe(3);
      expect(csRecord?.classesAttended).toBe(2);

      const csSub = await storage.getSubject('sub-cs');
      expect(csSub?.totalClassesHeld).toBe(3);
      expect(csSub?.totalClassesAttended).toBe(2);
    });

    it('rejects attended classes exceeding held classes', async () => {
      const entries: DailyAttendanceEntry[] = [
        { subjectId: 'sub-math', classesHeld: 2, classesAttended: 3 },
      ];

      await expect(
        saveDailyAttendanceSession(semesterId, today, entries, storage)
      ).rejects.toThrow('cannot exceed');
    });
  });

  describe('Editing Past Dates and Duplicate Prevention', () => {
    it('updates existing record on the same date without double-counting', async () => {
      // Day 1: Recorded Absent by mistake (1 held, 0 attended)
      await saveDailyAttendanceSession(
        semesterId,
        yesterday,
        [{ subjectId: 'sub-math', classesHeld: 1, classesAttended: 0 }],
        storage
      );

      let mathSub = await storage.getSubject('sub-math');
      expect(mathSub?.totalClassesHeld).toBe(1);
      expect(mathSub?.totalClassesAttended).toBe(0);

      // Correction: User was actually Present (1 held, 1 attended)
      const res = await saveDailyAttendanceSession(
        semesterId,
        yesterday,
        [{ subjectId: 'sub-math', classesHeld: 1, classesAttended: 1 }],
        storage
      );
      expect(res.savedCount).toBe(1);

      // Verify records count: exactly 1 record for this subject & date, NOT 2
      const allRecords = await storage.getAttendanceRecords('sub-math');
      expect(allRecords).toHaveLength(1);
      expect(allRecords[0]?.classesHeld).toBe(1);
      expect(allRecords[0]?.classesAttended).toBe(1);

      // Verify aggregate subject totals reflect correction exactly once
      mathSub = await storage.getSubject('sub-math');
      expect(mathSub?.totalClassesHeld).toBe(1);
      expect(mathSub?.totalClassesAttended).toBe(1);
    });

    it('clears and deletes existing record if user changes date entry to No Class (0 held)', async () => {
      // First save 1 class
      await saveDailyAttendanceSession(
        semesterId,
        yesterday,
        [{ subjectId: 'sub-math', classesHeld: 1, classesAttended: 1 }],
        storage
      );

      // User later corrects to No Class (was a holiday)
      const res = await saveDailyAttendanceSession(
        semesterId,
        yesterday,
        [{ subjectId: 'sub-math', classesHeld: 0, classesAttended: 0 }],
        storage
      );
      expect(res.clearedCount).toBe(1);

      const record = await storage.getAttendanceRecordBySubjectAndDate('sub-math', yesterday);
      expect(record).toBeUndefined();

      const mathSub = await storage.getSubject('sub-math');
      expect(mathSub?.totalClassesHeld).toBe(0);
      expect(mathSub?.totalClassesAttended).toBe(0);
    });

    it('maintains independent records across multiple dates', async () => {
      // Yesterday: Math 1 held, 1 attended
      await saveDailyAttendanceSession(
        semesterId,
        yesterday,
        [{ subjectId: 'sub-math', classesHeld: 1, classesAttended: 1 }],
        storage
      );

      // Today: Math 2 held, 1 attended
      await saveDailyAttendanceSession(
        semesterId,
        today,
        [{ subjectId: 'sub-math', classesHeld: 2, classesAttended: 1 }],
        storage
      );

      const records = await storage.getAttendanceRecords('sub-math');
      expect(records).toHaveLength(2);

      const mathSub = await storage.getSubject('sub-math');
      expect(mathSub?.totalClassesHeld).toBe(3); // 1 + 2
      expect(mathSub?.totalClassesAttended).toBe(2); // 1 + 1
    });
  });

  describe('Tracking Mode Safeguards & Semester Isolation', () => {
    it('prevents recording daily attendance for Manual Totals subjects', async () => {
      const entries: DailyAttendanceEntry[] = [
        { subjectId: 'sub-manual', classesHeld: 1, classesAttended: 1 },
      ];

      await expect(
        saveDailyAttendanceSession(semesterId, today, entries, storage)
      ).rejects.toThrow(/uses Manual Totals tracking/i);

      // Manual totals subject must remain unchanged
      const manualSub = await storage.getSubject('sub-manual');
      expect(manualSub?.totalClassesHeld).toBe(10);
      expect(manualSub?.totalClassesAttended).toBe(9);
    });

    it('rejects recording attendance for subject belonging to a different semester', async () => {
      const otherSemesterId = 'sem-other';
      await storage.saveSubject({
        id: 'sub-other',
        semesterId: otherSemesterId,
        name: 'Foreign Subject',
        attendanceTarget: 75,
        trackingMode: 'daily',
        totalClassesHeld: 0,
        totalClassesAttended: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const entries: DailyAttendanceEntry[] = [
        { subjectId: 'sub-other', classesHeld: 1, classesAttended: 1 },
      ];

      await expect(
        saveDailyAttendanceSession(semesterId, today, entries, storage)
      ).rejects.toThrow(/does not belong to semester/i);
    });
  });

  describe('Future Date Policy', () => {
    it('rejects recording attendance for future dates by default', async () => {
      const tomorrow = addDays(today, 1);
      const entries: DailyAttendanceEntry[] = [
        { subjectId: 'sub-math', classesHeld: 1, classesAttended: 1 },
      ];

      await expect(
        saveDailyAttendanceSession(semesterId, tomorrow, entries, storage)
      ).rejects.toThrow(/Cannot record attendance for future date/i);
    });

    it('allows future dates if explicitly permitted via options', async () => {
      const tomorrow = addDays(today, 1);
      const entries: DailyAttendanceEntry[] = [
        { subjectId: 'sub-math', classesHeld: 1, classesAttended: 1 },
      ];

      const res = await saveDailyAttendanceSession(semesterId, tomorrow, entries, storage, {
        allowFuture: true,
      });
      expect(res.savedCount).toBe(1);
    });
  });

  describe('Querying and Syncing', () => {
    it('gets daily attendance records for a specific date as a lookup map', async () => {
      await saveDailyAttendanceSession(
        semesterId,
        today,
        [
          { subjectId: 'sub-math', classesHeld: 1, classesAttended: 1 },
          { subjectId: 'sub-cs', classesHeld: 2, classesAttended: 1 },
        ],
        storage
      );

      const map = await getDailyAttendanceForDate(semesterId, today, storage);
      expect(map.size).toBe(2);
      expect(map.get('sub-math')?.classesAttended).toBe(1);
      expect(map.get('sub-cs')?.classesAttended).toBe(1);
      expect(map.get('sub-cs')?.classesHeld).toBe(2);
    });

    it('resynchronizes subject totals accurately', async () => {
      // Add two daily records
      await storage.saveAttendanceRecord({
        id: 'r1',
        subjectId: 'sub-math',
        date: yesterday,
        classesHeld: 2,
        classesAttended: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await storage.saveAttendanceRecord({
        id: 'r2',
        subjectId: 'sub-math',
        date: today,
        classesHeld: 1,
        classesAttended: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const synced = await syncSubjectTotals('sub-math', storage);
      expect(synced.totalClassesHeld).toBe(3);
      expect(synced.totalClassesAttended).toBe(2);
    });
  });
});
