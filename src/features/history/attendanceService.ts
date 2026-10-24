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
