import { DailyAttendanceRecord } from '../../types/attendance';
import { Subject } from '../../types/subject';
import { IStorage } from '../../types/storage';
import { validateCounts } from '../attendance/calculations';
import { isValidDateString, isFutureDate, getTodayLocalDateString } from '../../utils/dates';

export interface DailyAttendanceEntry {
  subjectId: string;
  classesHeld: number; // 0 indicates "No Class"
  classesAttended: number; // 0 <= classesAttended <= classesHeld
  notes?: string;
}

export interface DailyAttendanceSaveResult {
  savedCount: number;
  clearedCount: number;
  updatedSubjectIds: string[];
}

/**
 * Validates a daily attendance entry.
 */
export function validateDailyEntry(entry: DailyAttendanceEntry, subject?: Subject): void {
  if (subject && subject.trackingMode === 'manual') {
    if (entry.classesHeld > 0) {
      throw new Error(`Subject "${subject.name}" uses Manual Totals tracking and cannot record daily classes.`);
    }
  }

  if (entry.classesHeld < 0 || !Number.isInteger(entry.classesHeld)) {
    throw new Error('Classes held must be a non-negative whole number.');
  }
  if (entry.classesAttended < 0 || !Number.isInteger(entry.classesAttended)) {
    throw new Error('Classes attended must be a non-negative whole number.');
  }
  if (entry.classesAttended > entry.classesHeld) {
    throw new Error('Classes attended cannot exceed classes held.');
  }
}

/**
 * Loads all daily attendance records for a semester on a specific date.
 * Returns a map of subjectId -> DailyAttendanceRecord.
 */
export async function getDailyAttendanceForDate(
  semesterId: string,
  date: string,
  storage: IStorage
): Promise<Map<string, DailyAttendanceRecord>> {
  if (!isValidDateString(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD.`);
  }

  const [subjectsInSemester, recordsOnDate] = await Promise.all([
    storage.getSubjects(semesterId),
    storage.getAttendanceRecordsByDate(date),
  ]);

  const subjectIds = new Set(subjectsInSemester.map((s) => s.id));
  const recordMap = new Map<string, DailyAttendanceRecord>();

  for (const rec of recordsOnDate) {
    if (subjectIds.has(rec.subjectId)) {
      recordMap.set(rec.subjectId, rec);
    }
  }

  return recordMap;
}

/**
 * Saves or updates daily attendance for multiple subjects on a specific date.
 * Enforces atomic updates to both records and subject aggregate totals.
 */
export async function saveDailyAttendanceSession(
  semesterId: string,
  date: string,
  entries: DailyAttendanceEntry[],
  storage: IStorage,
  options: { allowFuture?: boolean } = {}
): Promise<DailyAttendanceSaveResult> {
  // Validate Date
  if (!isValidDateString(date)) {
    throw new Error(`Invalid calendar date: "${date}". Expected YYYY-MM-DD.`);
  }

  const today = getTodayLocalDateString();
  if (!options.allowFuture && isFutureDate(date, today)) {
    throw new Error(`Cannot record attendance for future date ${date}. Today is ${today}.`);
  }

  // Load semester subjects
  const subjectsInSemester = await storage.getSubjects(semesterId);
  const subjectMap = new Map<string, Subject>(subjectsInSemester.map((s) => [s.id, s]));

  const recordsToSave: DailyAttendanceRecord[] = [];
  const recordIdsToDelete: string[] = [];
  const affectedSubjectIds = new Set<string>();

  const now = new Date().toISOString();

  // Process each entry
  for (const entry of entries) {
    const subject = subjectMap.get(entry.subjectId);
    if (!subject) {
      throw new Error(`Subject with ID "${entry.subjectId}" does not belong to semester "${semesterId}".`);
    }

    validateDailyEntry(entry, subject);

    // Skip manual tracking subjects
    if (subject.trackingMode === 'manual') {
      continue;
    }

    affectedSubjectIds.add(subject.id);

    const existingRecord = await storage.getAttendanceRecordBySubjectAndDate(subject.id, date);

    if (entry.classesHeld === 0) {
      // "No Class": delete existing record if one was present; otherwise do nothing
      if (existingRecord) {
        recordIdsToDelete.push(existingRecord.id);
      }
    } else {
      // Classes were held
      validateCounts(entry.classesHeld, entry.classesAttended);

      if (existingRecord) {
        // Update existing record
        recordsToSave.push({
          ...existingRecord,
          classesHeld: entry.classesHeld,
          classesAttended: entry.classesAttended,
          notes: entry.notes?.trim() || undefined,
          updatedAt: now,
        });
      } else {
        // Create new record
        recordsToSave.push({
          id: crypto.randomUUID(),
          subjectId: subject.id,
          date,
          classesHeld: entry.classesHeld,
          classesAttended: entry.classesAttended,
          notes: entry.notes?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  // Recalculate totals for all affected daily-tracked subjects
  const updatedSubjects: Subject[] = [];

  for (const subId of affectedSubjectIds) {
    const subject = subjectMap.get(subId);
    if (!subject || subject.trackingMode === 'manual') continue;

    // Fetch existing records for this subject
    const existingRecords = await storage.getAttendanceRecords(subId);

    // Create a working map representing the updated record state
    const workingRecordsMap = new Map<string, { held: number; attended: number }>();
    for (const r of existingRecords) {
      workingRecordsMap.set(r.id, { held: r.classesHeld, attended: r.classesAttended });
    }

    // Apply deletions
    for (const delId of recordIdsToDelete) {
      workingRecordsMap.delete(delId);
    }

    // Apply saves/updates
    for (const saved of recordsToSave) {
      if (saved.subjectId === subId) {
        workingRecordsMap.set(saved.id, { held: saved.classesHeld, attended: saved.classesAttended });
      }
    }

    // Sum all classes
    let totalHeld = subject.initialClassesHeld || 0;
    let totalAttended = subject.initialClassesAttended || 0;

    for (const rec of workingRecordsMap.values()) {
      totalHeld += rec.held;
      totalAttended += rec.attended;
    }

    updatedSubjects.push({
      ...subject,
      totalClassesHeld: totalHeld,
      totalClassesAttended: totalAttended,
      updatedAt: now,
    });
  }

  // Atomically commit batch changes to IndexedDB
  await storage.saveAttendanceBatch(recordsToSave, recordIdsToDelete, updatedSubjects);

  return {
    savedCount: recordsToSave.length,
    clearedCount: recordIdsToDelete.length,
    updatedSubjectIds: Array.from(affectedSubjectIds),
  };
}

/**
 * Re-synchronizes a subject's aggregate totals from its underlying daily attendance records.
 * Useful for consistency checks or integrity restoration.
 */
export async function syncSubjectTotals(subjectId: string, storage: IStorage): Promise<Subject> {
  const subject = await storage.getSubject(subjectId);
  if (!subject) {
    throw new Error(`Subject with ID "${subjectId}" not found.`);
  }

  if (subject.trackingMode === 'manual') {
    return subject;
  }

  const records = await storage.getAttendanceRecords(subjectId);

  let totalHeld = subject.initialClassesHeld || 0;
  let totalAttended = subject.initialClassesAttended || 0;

  for (const r of records) {
    totalHeld += r.classesHeld;
    totalAttended += r.classesAttended;
  }

  const updated: Subject = {
    ...subject,
    totalClassesHeld: totalHeld,
    totalClassesAttended: totalAttended,
    updatedAt: new Date().toISOString(),
  };

  await storage.saveSubject(updated);
  return updated;
}

export interface AttendanceHistoryItem {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  semesterId: string;
  semesterName: string;
  date: string;
  classesHeld: number;
  classesAttended: number;
  classesMissed: number;
  attendancePercentage: number | null;
  status: 'full' | 'partial' | 'zero' | 'no_class';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetAttendanceHistoryFilters {
  semesterId?: string;
  subjectId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Deletes an individual daily attendance record and atomically synchronizes
 * the owning subject's aggregate attendance counts to prevent metrics drift.
 */
export async function deleteAttendanceRecordAndSync(
  recordId: string,
  storage: IStorage
): Promise<{ subjectId: string; updatedHeld: number; updatedAttended: number }> {
  const record = await storage.getAttendanceRecord(recordId);
  if (!record) {
    throw new Error(`Attendance record with ID "${recordId}" was not found.`);
  }

  const subject = await storage.getSubject(record.subjectId);
  if (!subject) {
    // If subject was already removed, simply delete the orphaned record
    await storage.deleteAttendanceRecord(recordId);
    return { subjectId: record.subjectId, updatedHeld: 0, updatedAttended: 0 };
  }

  if (subject.trackingMode === 'manual') {
    // For manual tracking, delete record without modifying manual totals
    await storage.deleteAttendanceRecord(recordId);
    return {
      subjectId: subject.id,
      updatedHeld: subject.totalClassesHeld,
      updatedAttended: subject.totalClassesAttended,
    };
  }

  // Fetch all existing records for this subject
  const allRecords = await storage.getAttendanceRecords(subject.id);
  const remainingRecords = allRecords.filter((r) => r.id !== recordId);

  let newHeld = subject.initialClassesHeld || 0;
  let newAttended = subject.initialClassesAttended || 0;

  for (const r of remainingRecords) {
    newHeld += r.classesHeld;
    newAttended += r.classesAttended;
  }

  const updatedSubject: Subject = {
    ...subject,
    totalClassesHeld: newHeld,
    totalClassesAttended: newAttended,
    updatedAt: new Date().toISOString(),
  };

  // Atomically delete the record and update the subject
  await storage.saveAttendanceBatch([], [recordId], [updatedSubject]);

  return {
    subjectId: subject.id,
    updatedHeld: newHeld,
    updatedAttended: newAttended,
  };
}

/**
 * Updates an individual daily attendance record and atomically synchronizes
 * the owning subject's aggregate attendance counts.
 * If classesHeld is set to 0 ("No Class"), the record is deleted and counts recomputed.
 */
export async function updateAttendanceRecordAndSync(
  recordId: string,
  input: {
    classesHeld: number;
    classesAttended: number;
    notes?: string;
  },
  storage: IStorage
): Promise<DailyAttendanceRecord | null> {
  const record = await storage.getAttendanceRecord(recordId);
  if (!record) {
    throw new Error(`Attendance record with ID "${recordId}" was not found.`);
  }

  if (input.classesHeld < 0 || !Number.isInteger(input.classesHeld)) {
    throw new Error('Classes held must be a non-negative whole number.');
  }
  if (input.classesAttended < 0 || !Number.isInteger(input.classesAttended)) {
    throw new Error('Classes attended must be a non-negative whole number.');
  }
  if (input.classesAttended > input.classesHeld) {
    throw new Error('Classes attended cannot exceed classes held.');
  }

  // If classesHeld === 0, treat as "No Class" -> delete record & sync
  if (input.classesHeld === 0) {
    await deleteAttendanceRecordAndSync(recordId, storage);
    return null;
  }

  const subject = await storage.getSubject(record.subjectId);
  if (!subject) {
    throw new Error(`Owning subject for record "${recordId}" was not found.`);
  }

  if (subject.trackingMode === 'manual') {
    throw new Error(`Subject "${subject.name}" uses Manual Totals tracking and cannot record daily classes.`);
  }

  const now = new Date().toISOString();
  const updatedRecord: DailyAttendanceRecord = {
    ...record,
    classesHeld: input.classesHeld,
    classesAttended: input.classesAttended,
    notes: input.notes?.trim() || undefined,
    updatedAt: now,
  };

  // Recalculate subject totals
  const allRecords = await storage.getAttendanceRecords(subject.id);
  let newHeld = subject.initialClassesHeld || 0;
  let newAttended = subject.initialClassesAttended || 0;

  for (const r of allRecords) {
    if (r.id === recordId) {
      newHeld += updatedRecord.classesHeld;
      newAttended += updatedRecord.classesAttended;
    } else {
      newHeld += r.classesHeld;
      newAttended += r.classesAttended;
    }
  }

  const updatedSubject: Subject = {
    ...subject,
    totalClassesHeld: newHeld,
    totalClassesAttended: newAttended,
    updatedAt: now,
  };

  // Atomically save record and updated subject
  await storage.saveAttendanceBatch([updatedRecord], [], [updatedSubject]);

  return updatedRecord;
}

/**
 * Retrieves attendance records matching filters, enriched with subject & semester metadata,
 * sorted chronologically descending (most recent first).
 */
export async function getAttendanceHistory(
  filters: GetAttendanceHistoryFilters,
  storage: IStorage
): Promise<AttendanceHistoryItem[]> {
  const [semesters, allSubjects] = await Promise.all([
    storage.getSemesters(),
    storage.getSubjects(),
  ]);

  const semesterMap = new Map<string, string>(semesters.map((s) => [s.id, s.name]));
  const subjectMap = new Map<string, Subject>(allSubjects.map((s) => [s.id, s]));

  let records: DailyAttendanceRecord[] = [];

  if (filters.subjectId) {
    records = await storage.getAttendanceRecords(filters.subjectId);
  } else if (filters.semesterId) {
    const semSubjects = allSubjects.filter((s) => s.semesterId === filters.semesterId);
    const semSubjectIds = new Set(semSubjects.map((s) => s.id));
    const allRecords = await storage.getAttendanceRecords();
    records = allRecords.filter((r) => semSubjectIds.has(r.subjectId));
  } else {
    records = await storage.getAttendanceRecords();
  }

  // Apply date range filters if present
  if (filters.startDate) {
    records = records.filter((r) => r.date >= filters.startDate!);
  }
  if (filters.endDate) {
    records = records.filter((r) => r.date <= filters.endDate!);
  }

  // Enrich records
  const items: AttendanceHistoryItem[] = [];

  for (const rec of records) {
    const sub = subjectMap.get(rec.subjectId);
    if (!sub) continue; // Skip orphaned records if any

    const semName = semesterMap.get(sub.semesterId) || 'Unknown Semester';
    const missed = Math.max(0, rec.classesHeld - rec.classesAttended);
    const pct = rec.classesHeld > 0 ? (rec.classesAttended / rec.classesHeld) * 100 : null;

    let status: 'full' | 'partial' | 'zero' | 'no_class' = 'no_class';
    if (rec.classesHeld > 0) {
      if (rec.classesAttended === rec.classesHeld) {
        status = 'full';
      } else if (rec.classesAttended === 0) {
        status = 'zero';
      } else {
        status = 'partial';
      }
    }

    items.push({
      id: rec.id,
      subjectId: rec.subjectId,
      subjectName: sub.name,
      subjectCode: sub.subjectCode,
      semesterId: sub.semesterId,
      semesterName: semName,
      date: rec.date,
      classesHeld: rec.classesHeld,
      classesAttended: rec.classesAttended,
      classesMissed: missed,
      attendancePercentage: pct,
      status,
      notes: rec.notes,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
    });
  }

  // Sort descending: by date DESC, then subject name ASC
  items.sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return a.subjectName.localeCompare(b.subjectName);
  });

  return items;
}

