import { Semester } from './semester';
import { Subject } from './subject';
import { DailyAttendanceRecord } from './attendance';

export interface AppSettings {
  defaultAttendanceTarget: number; // Defaults to 75
  activeSemesterId: string | null;
  theme: 'light';
  weekStartsOn: 0 | 1; // 0 for Sunday, 1 for Monday
}

export interface BackupData {
  schemaVersion: number;
  exportedAt: string; // ISO 8601
  settings: AppSettings;
  semesters: Semester[];
  subjects: Subject[];
  attendanceRecords: DailyAttendanceRecord[];
}

export interface IStorage {
  // Semester operations
  getSemesters(): Promise<Semester[]>;
  getSemester(id: string): Promise<Semester | undefined>;
  saveSemester(semester: Semester): Promise<void>;
  deleteSemester(id: string): Promise<void>;

  // Subject operations
  getSubjects(semesterId?: string): Promise<Subject[]>;
  getSubject(id: string): Promise<Subject | undefined>;
  saveSubject(subject: Subject): Promise<void>;
  deleteSubject(id: string): Promise<void>;

  // Attendance record operations
  getAttendanceRecords(subjectId?: string): Promise<DailyAttendanceRecord[]>;
  getAttendanceRecordsByDate(date: string): Promise<DailyAttendanceRecord[]>;
  saveAttendanceRecord(record: DailyAttendanceRecord): Promise<void>;
  deleteAttendanceRecord(id: string): Promise<void>;

  // Settings
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;

  // Backup & Import
  exportData(): Promise<BackupData>;
  importData(data: BackupData): Promise<void>;
  clearAllData(): Promise<void>;
}
