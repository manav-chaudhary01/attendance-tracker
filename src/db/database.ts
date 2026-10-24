import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Semester, SemesterStatus } from '../types/semester';
import { Subject } from '../types/subject';
import { DailyAttendanceRecord } from '../types/attendance';
import { AppSettings, BackupData, IStorage } from '../types/storage';

const DB_NAME = 'personal-attendance-tracker';
const DB_VERSION = 1;

export const DEFAULT_SETTINGS: AppSettings = {
  defaultAttendanceTarget: 75,
  activeSemesterId: null,
  theme: 'light',
  weekStartsOn: 1, // Monday
};

interface AttendanceTrackerDBSchema extends DBSchema {
  semesters: {
    key: string;
    value: Semester;
    indexes: {
      'by-status': SemesterStatus;
      'by-created': string;
    };
  };
  subjects: {
    key: string;
    value: Subject;
    indexes: {
      'by-semester': string;
      'by-created': string;
    };
  };
  attendance_records: {
    key: string;
    value: DailyAttendanceRecord;
    indexes: {
      'by-subject': string;
      'by-date': string;
      'by-subject-date': [string, string];
    };
  };
  settings: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<AttendanceTrackerDBSchema>> | null = null;

export function getDb(): Promise<IDBPDatabase<AttendanceTrackerDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<AttendanceTrackerDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          // Semesters store
          const semesterStore = db.createObjectStore('semesters', { keyPath: 'id' });
          semesterStore.createIndex('by-status', 'status');
          semesterStore.createIndex('by-created', 'createdAt');

          // Subjects store
          const subjectStore = db.createObjectStore('subjects', { keyPath: 'id' });
          subjectStore.createIndex('by-semester', 'semesterId');
          subjectStore.createIndex('by-created', 'createdAt');

          // Attendance records store
          const recordStore = db.createObjectStore('attendance_records', { keyPath: 'id' });
          recordStore.createIndex('by-subject', 'subjectId');
          recordStore.createIndex('by-date', 'date');
          recordStore.createIndex('by-subject-date', ['subjectId', 'date']);

          // Settings store
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

export class IndexedDBStorage implements IStorage {
  async getSemesters(): Promise<Semester[]> {
    const db = await getDb();
    return db.getAll('semesters');
  }

  async getSemester(id: string): Promise<Semester | undefined> {
    const db = await getDb();
    return db.get('semesters', id);
  }

  async saveSemester(semester: Semester): Promise<void> {
    const db = await getDb();
    await db.put('semesters', semester);
  }

  async deleteSemester(id: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(['semesters', 'subjects', 'attendance_records'], 'readwrite');
    
    // Find all subjects in this semester
    const subjects = await tx.objectStore('subjects').index('by-semester').getAll(id);
    const subjectIds = subjects.map(s => s.id);
    
    // Delete attendance records for all these subjects
    const recordStore = tx.objectStore('attendance_records');
    for (const subId of subjectIds) {
      const records = await recordStore.index('by-subject').getAll(subId);
      for (const rec of records) {
        await recordStore.delete(rec.id);
      }
      await tx.objectStore('subjects').delete(subId);
    }

    // Delete the semester itself
    await tx.objectStore('semesters').delete(id);
    await tx.done;
  }

  async getSubjects(semesterId?: string): Promise<Subject[]> {
    const db = await getDb();
    if (semesterId) {
      return db.getAllFromIndex('subjects', 'by-semester', semesterId);
    }
    return db.getAll('subjects');
  }

  async getSubject(id: string): Promise<Subject | undefined> {
    const db = await getDb();
    return db.get('subjects', id);
  }

  async saveSubject(subject: Subject): Promise<void> {
    const db = await getDb();
    await db.put('subjects', subject);
  }

  async deleteSubject(id: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(['subjects', 'attendance_records'], 'readwrite');
    const records = await tx.objectStore('attendance_records').index('by-subject').getAll(id);
    for (const rec of records) {
      await tx.objectStore('attendance_records').delete(rec.id);
    }
    await tx.objectStore('subjects').delete(id);
    await tx.done;
  }

  async getAttendanceRecords(subjectId?: string): Promise<DailyAttendanceRecord[]> {
    const db = await getDb();
    if (subjectId) {
      return db.getAllFromIndex('attendance_records', 'by-subject', subjectId);
    }
    return db.getAll('attendance_records');
  }

  async getAttendanceRecordsByDate(date: string): Promise<DailyAttendanceRecord[]> {
    const db = await getDb();
    return db.getAllFromIndex('attendance_records', 'by-date', date);
  }

  async getAttendanceRecordBySubjectAndDate(
    subjectId: string,
    date: string
  ): Promise<DailyAttendanceRecord | undefined> {
    const db = await getDb();
    return db.getFromIndex('attendance_records', 'by-subject-date', [subjectId, date]);
  }

  async saveAttendanceRecord(record: DailyAttendanceRecord): Promise<void> {
    const db = await getDb();
    await db.put('attendance_records', record);
  }

  async deleteAttendanceRecord(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('attendance_records', id);
  }

  async saveAttendanceBatch(
    recordsToSave: DailyAttendanceRecord[],
    recordIdsToDelete: string[],
    updatedSubjects: Subject[]
  ): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(['subjects', 'attendance_records'], 'readwrite');
    const recordStore = tx.objectStore('attendance_records');
    const subjectStore = tx.objectStore('subjects');

    for (const rec of recordsToSave) {
      await recordStore.put(rec);
    }

    for (const recId of recordIdsToDelete) {
      await recordStore.delete(recId);
    }

    for (const subj of updatedSubjects) {
      await subjectStore.put(subj);
    }

    await tx.done;
  }

  async getSettings(): Promise<AppSettings> {
    const db = await getDb();
    const stored = await db.get('settings', 'app_settings');
    if (!stored || typeof stored !== 'object') {
      return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS, ...(stored as Partial<AppSettings>) };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await getDb();
    await db.put('settings', settings, 'app_settings');
  }

  async exportData(): Promise<BackupData> {
    const db = await getDb();
    const [settings, semesters, subjects, attendanceRecords] = await Promise.all([
      this.getSettings(),
      db.getAll('semesters'),
      db.getAll('subjects'),
      db.getAll('attendance_records'),
    ]);

    return {
      schemaVersion: DB_VERSION,
      exportedAt: new Date().toISOString(),
      settings,
      semesters,
      subjects,
      attendanceRecords,
    };
  }

  async importData(data: BackupData): Promise<void> {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid backup file format');
    }
    if (!data.schemaVersion || data.schemaVersion > DB_VERSION) {
      throw new Error(`Unsupported schema version: ${data.schemaVersion}`);
    }

    const db = await getDb();
    const tx = db.transaction(['semesters', 'subjects', 'attendance_records', 'settings'], 'readwrite');

    // Clear existing stores
    await tx.objectStore('semesters').clear();
    await tx.objectStore('subjects').clear();
    await tx.objectStore('attendance_records').clear();
    await tx.objectStore('settings').clear();

    // Import settings
    await tx.objectStore('settings').put(data.settings || DEFAULT_SETTINGS, 'app_settings');

    // Import semesters
    for (const semester of data.semesters || []) {
      await tx.objectStore('semesters').put(semester);
    }

    // Import subjects
    for (const subject of data.subjects || []) {
      await tx.objectStore('subjects').put(subject);
    }

    // Import records
    for (const record of data.attendanceRecords || []) {
      await tx.objectStore('attendance_records').put(record);
    }

    await tx.done;
  }

  async clearAllData(): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(['semesters', 'subjects', 'attendance_records', 'settings'], 'readwrite');
    await tx.objectStore('semesters').clear();
    await tx.objectStore('subjects').clear();
    await tx.objectStore('attendance_records').clear();
    await tx.objectStore('settings').clear();
    await tx.done;
  }
}

export const storage = new IndexedDBStorage();
