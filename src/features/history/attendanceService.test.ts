import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../test/mockStorage';
import {
  saveDailyAttendanceSession,
  getDailyAttendanceForDate,
  syncSubjectTotals,
  deleteAttendanceRecordAndSync,
  updateAttendanceRecordAndSync,
  getAttendanceHistory,
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

  describe('deleteAttendanceRecordAndSync', () => {
    it('deletes an attendance record and atomically decreases subject totals', async () => {
      // Create record
      await storage.saveAttendanceRecord({
        id: 'rec-1',
        subjectId: 'sub-math',
        date: yesterday,
        classesHeld: 3,
        classesAttended: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      // Set subject totals
      const mathSub = await storage.getSubject('sub-math');
      await storage.saveSubject({
        ...mathSub!,
        totalClassesHeld: 3,
        totalClassesAttended: 2,
      });

      const res = await deleteAttendanceRecordAndSync('rec-1', storage);
      expect(res.updatedHeld).toBe(0);
      expect(res.updatedAttended).toBe(0);

      // Verify record is gone
      const record = await storage.getAttendanceRecord('rec-1');
      expect(record).toBeUndefined();

      // Verify subject total is 0
      const updatedSub = await storage.getSubject('sub-math');
      expect(updatedSub?.totalClassesHeld).toBe(0);
      expect(updatedSub?.totalClassesAttended).toBe(0);
    });

    it('preserves initial baseline classes when deleting a record', async () => {
      const mathSub = await storage.getSubject('sub-math');
      await storage.saveSubject({
        ...mathSub!,
        initialClassesHeld: 5,
        initialClassesAttended: 4,
        totalClassesHeld: 7,
        totalClassesAttended: 6,
      });

      await storage.saveAttendanceRecord({
        id: 'rec-2',
        subjectId: 'sub-math',
        date: yesterday,
        classesHeld: 2,
        classesAttended: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await deleteAttendanceRecordAndSync('rec-2', storage);
      expect(res.updatedHeld).toBe(5);
      expect(res.updatedAttended).toBe(4);

      const updatedSub = await storage.getSubject('sub-math');
      expect(updatedSub?.totalClassesHeld).toBe(5);
      expect(updatedSub?.totalClassesAttended).toBe(4);
    });

    it('throws error when record ID does not exist', async () => {
      await expect(deleteAttendanceRecordAndSync('non-existent', storage)).rejects.toThrow(
        'was not found'
      );
    });
  });

  describe('updateAttendanceRecordAndSync', () => {
    it('updates record counts and recomputes subject totals', async () => {
      await storage.saveAttendanceRecord({
        id: 'rec-3',
        subjectId: 'sub-math',
        date: yesterday,
        classesHeld: 1,
        classesAttended: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const mathSub = await storage.getSubject('sub-math');
      await storage.saveSubject({
        ...mathSub!,
        totalClassesHeld: 1,
        totalClassesAttended: 1,
      });

      const updatedRec = await updateAttendanceRecordAndSync(
        'rec-3',
        { classesHeld: 2, classesAttended: 1, notes: 'Double session' },
        storage
      );

      expect(updatedRec).toBeDefined();
      expect(updatedRec?.classesHeld).toBe(2);
      expect(updatedRec?.classesAttended).toBe(1);
      expect(updatedRec?.notes).toBe('Double session');

      const updatedSub = await storage.getSubject('sub-math');
      expect(updatedSub?.totalClassesHeld).toBe(2);
      expect(updatedSub?.totalClassesAttended).toBe(1);
    });

    it('deletes record when updated classesHeld is 0 (No Class)', async () => {
      await storage.saveAttendanceRecord({
        id: 'rec-4',
        subjectId: 'sub-math',
        date: yesterday,
        classesHeld: 1,
        classesAttended: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await updateAttendanceRecordAndSync(
        'rec-4',
        { classesHeld: 0, classesAttended: 0 },
        storage
      );

      expect(res).toBeNull();
      const rec = await storage.getAttendanceRecord('rec-4');
      expect(rec).toBeUndefined();
    });

    it('rejects invalid inputs when classesAttended exceeds classesHeld', async () => {
      await storage.saveAttendanceRecord({
        id: 'rec-5',
        subjectId: 'sub-math',
        date: yesterday,
        classesHeld: 1,
        classesAttended: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await expect(
        updateAttendanceRecordAndSync('rec-5', { classesHeld: 1, classesAttended: 2 }, storage)
      ).rejects.toThrow('Classes attended cannot exceed classes held');
    });
  });

  describe('getAttendanceHistory', () => {
    beforeEach(async () => {
      // Add multiple records across dates
      await storage.saveAttendanceRecord({
        id: 'hist-1',
        subjectId: 'sub-math',
        date: '2026-10-20',
        classesHeld: 2,
        classesAttended: 2, // 100% full
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await storage.saveAttendanceRecord({
        id: 'hist-2',
        subjectId: 'sub-math',
        date: '2026-10-22',
        classesHeld: 2,
        classesAttended: 1, // 50% partial
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await storage.saveAttendanceRecord({
        id: 'hist-3',
        subjectId: 'sub-cs',
        date: '2026-10-22',
        classesHeld: 1,
        classesAttended: 0, // 0% zero
        notes: 'Medical leave',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    it('retrieves all history records sorted by date descending', async () => {
      const history = await getAttendanceHistory({ semesterId }, storage);
      expect(history.length).toBe(3);
      // Top record should be latest date (2026-10-22)
      expect(history[0]!.date).toBe('2026-10-22');
      expect(history[1]!.date).toBe('2026-10-22');
      expect(history[2]!.date).toBe('2026-10-20');
    });

    it('correctly classifies status as full, partial, or zero', async () => {
      const history = await getAttendanceHistory({ semesterId }, storage);
      const mathOct20 = history.find((h) => h.id === 'hist-1');
      expect(mathOct20?.status).toBe('full');
      expect(mathOct20?.attendancePercentage).toBe(100);

      const mathOct22 = history.find((h) => h.id === 'hist-2');
      expect(mathOct22?.status).toBe('partial');
      expect(mathOct22?.attendancePercentage).toBe(50);

      const csOct22 = history.find((h) => h.id === 'hist-3');
      expect(csOct22?.status).toBe('zero');
      expect(csOct22?.attendancePercentage).toBe(0);
      expect(csOct22?.notes).toBe('Medical leave');
    });

    it('filters records by subject ID', async () => {
      const csOnly = await getAttendanceHistory({ subjectId: 'sub-cs' }, storage);
      expect(csOnly.length).toBe(1);
      expect(csOnly[0]!.subjectId).toBe('sub-cs');
    });

    it('filters records by date range', async () => {
      const filtered = await getAttendanceHistory(
        {
          semesterId,
          startDate: '2026-10-21',
          endDate: '2026-10-23',
        },
        storage
      );
      expect(filtered.length).toBe(2);
      expect(filtered.every((f) => f.date === '2026-10-22')).toBe(true);
    });
  });
});
