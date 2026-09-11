import { BackupData, IStorage } from '../../types/storage';
import { getTodayLocalDateString } from '../../utils/dates';

export interface BackupValidationSummary {
  schemaVersion: number;
  exportedAt: string;
  semesterCount: number;
  subjectCount: number;
  recordCount: number;
}

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  data?: BackupData;
  summary?: BackupValidationSummary;
}

/**
 * Validates the structure and referential integrity of an imported backup object.
 * Rejects malformed JSON, missing fields, invalid types, unsupported schema versions,
 * or broken references between subjects, semesters, and attendance records.
 */
export function validateBackupData(parsedJson: unknown): BackupValidationResult {
  if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
    return { isValid: false, error: 'Backup file must contain a valid JSON object.' };
  }

  const obj = parsedJson as Record<string, unknown>;

  if (typeof obj.schemaVersion !== 'number') {
    return { isValid: false, error: 'Backup file is missing required "schemaVersion" property.' };
  }

  if (obj.schemaVersion < 1 || obj.schemaVersion > 1) {
    return {
      isValid: false,
      error: `Unsupported backup schema version: ${obj.schemaVersion}. This application supports schema version 1.`,
    };
  }

  if (!Array.isArray(obj.semesters)) {
    return { isValid: false, error: 'Backup file must contain a "semesters" array.' };
  }

  if (!Array.isArray(obj.subjects)) {
    return { isValid: false, error: 'Backup file must contain a "subjects" array.' };
  }

  if (!Array.isArray(obj.attendanceRecords)) {
    return { isValid: false, error: 'Backup file must contain an "attendanceRecords" array.' };
  }

  // Validate semesters
  for (let i = 0; i < obj.semesters.length; i++) {
    const sem = obj.semesters[i];
    if (
      !sem ||
      typeof sem !== 'object' ||
      typeof sem.id !== 'string' ||
      typeof sem.name !== 'string' ||
      (sem.status !== 'active' && sem.status !== 'archived')
    ) {
      return {
        isValid: false,
        error: `Invalid semester entry at index ${i}. Each semester must have a valid id, name, and status.`,
      };
    }
  }

  // Validate subjects and verify referential integrity with semesters
  const semesterIds = new Set(obj.semesters.map((s: { id: string }) => s.id));
  for (let i = 0; i < obj.subjects.length; i++) {
    const sub = obj.subjects[i];
    if (
      !sub ||
      typeof sub !== 'object' ||
      typeof sub.id !== 'string' ||
      typeof sub.name !== 'string' ||
      typeof sub.semesterId !== 'string' ||
      typeof sub.attendanceTarget !== 'number' ||
      (sub.trackingMode !== 'daily' && sub.trackingMode !== 'manual')
    ) {
      return {
        isValid: false,
        error: `Invalid subject entry at index ${i}. Each subject must have a valid id, name, semesterId, and trackingMode.`,
      };
    }

    if (!semesterIds.has(sub.semesterId)) {
      return {
        isValid: false,
        error: `Subject "${sub.name}" references non-existent semester ID "${sub.semesterId}".`,
      };
    }
  }

  // Validate attendance records and verify referential integrity with subjects
  const subjectIds = new Set(obj.subjects.map((s: { id: string }) => s.id));
  for (let i = 0; i < obj.attendanceRecords.length; i++) {
    const rec = obj.attendanceRecords[i];
    if (
      !rec ||
      typeof rec !== 'object' ||
      typeof rec.id !== 'string' ||
      typeof rec.subjectId !== 'string' ||
      typeof rec.date !== 'string' ||
      typeof rec.classesHeld !== 'number' ||
      typeof rec.classesAttended !== 'number'
    ) {
      return {
        isValid: false,
        error: `Invalid attendance record entry at index ${i}. Each record must have a valid id, subjectId, date, and counts.`,
      };
    }

    if (!subjectIds.has(rec.subjectId)) {
      return {
        isValid: false,
        error: `Attendance record for date "${rec.date}" references non-existent subject ID "${rec.subjectId}".`,
      };
    }

    if (rec.classesAttended > rec.classesHeld) {
      return {
        isValid: false,
        error: `Attendance record for date "${rec.date}" has classesAttended (${rec.classesAttended}) exceeding classesHeld (${rec.classesHeld}).`,
      };
    }
  }

  const validData = obj as unknown as BackupData;
  return {
    isValid: true,
    data: validData,
    summary: {
      schemaVersion: validData.schemaVersion,
      exportedAt: typeof validData.exportedAt === 'string' ? validData.exportedAt : new Date().toISOString(),
      semesterCount: validData.semesters.length,
      subjectCount: validData.subjects.length,
      recordCount: validData.attendanceRecords.length,
    },
  };
}

/**
 * Initiates a browser JSON file download containing the full application backup.
 */
export function triggerBackupDownload(backup: BackupData, filename?: string): void {
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const today = getTodayLocalDateString();
  link.href = url;
  link.download = filename || `attendance-tracker-backup-${today}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates and atomically imports backup data into local storage.
 */
export async function restoreBackupData(
  backup: BackupData,
  storage: IStorage
): Promise<BackupValidationSummary> {
  const validation = validateBackupData(backup);
  if (!validation.isValid || !validation.data) {
    throw new Error(validation.error || 'Invalid backup data.');
  }

  await storage.importData(validation.data);
  return validation.summary!;
}
