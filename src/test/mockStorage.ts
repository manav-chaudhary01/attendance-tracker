import { IStorage, AppSettings, BackupData } from '../types/storage';
import { Semester } from '../types/semester';
import { Subject } from '../types/subject';
import { DailyAttendanceRecord } from '../types/attendance';
import { DEFAULT_SETTINGS } from '../db/database';

export class MockStorage implements IStorage {
  public semesters: Semester[] = [];
  public subjects: Subject[] = [];
  public records: DailyAttendanceRecord[] = [];
  public settings: AppSettings = { ...DEFAULT_SETTINGS };

  async getSemesters(): Promise<Semester[]> {
    return [...this.semesters];
  }

  async getSemester(id: string): Promise<Semester | undefined> {
    return this.semesters.find((s) => s.id === id);
  }

  async saveSemester(semester: Semester): Promise<void> {
    const idx = this.semesters.findIndex((s) => s.id === semester.id);
    if (idx >= 0) {
      this.semesters[idx] = semester;
    } else {
      this.semesters.push(semester);
    }
  }

  async deleteSemester(id: string): Promise<void> {
    this.semesters = this.semesters.filter((s) => s.id !== id);
    const deletedSubjects = this.subjects.filter((s) => s.semesterId === id);
    const subIds = new Set(deletedSubjects.map((s) => s.id));
    this.subjects = this.subjects.filter((s) => s.semesterId !== id);
    this.records = this.records.filter((r) => !subIds.has(r.subjectId));
  }

  async getSubjects(semesterId?: string): Promise<Subject[]> {
    if (semesterId) {
      return this.subjects.filter((s) => s.semesterId === semesterId);
    }
    return [...this.subjects];
  }

  async getSubject(id: string): Promise<Subject | undefined> {
    return this.subjects.find((s) => s.id === id);
  }

  async saveSubject(subject: Subject): Promise<void> {
    const idx = this.subjects.findIndex((s) => s.id === subject.id);
    if (idx >= 0) {
      this.subjects[idx] = subject;
    } else {
      this.subjects.push(subject);
    }
  }

  async deleteSubject(id: string): Promise<void> {
    this.subjects = this.subjects.filter((s) => s.id !== id);
    this.records = this.records.filter((r) => r.subjectId !== id);
  }

  async getAttendanceRecord(id: string): Promise<DailyAttendanceRecord | undefined> {
    return this.records.find((r) => r.id === id);
  }

  async getAttendanceRecords(subjectId?: string): Promise<DailyAttendanceRecord[]> {
    if (subjectId) {
      return this.records.filter((r) => r.subjectId === subjectId);
    }
    return [...this.records];
  }

  async getAttendanceRecordsByDate(date: string): Promise<DailyAttendanceRecord[]> {
    return this.records.filter((r) => r.date === date);
  }

  async getAttendanceRecordBySubjectAndDate(
    subjectId: string,
    date: string
  ): Promise<DailyAttendanceRecord | undefined> {
    return this.records.find((r) => r.subjectId === subjectId && r.date === date);
  }

  async saveAttendanceRecord(record: DailyAttendanceRecord): Promise<void> {
    const idx = this.records.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      this.records[idx] = record;
    } else {
      this.records.push(record);
    }
  }

  async deleteAttendanceRecord(id: string): Promise<void> {
    this.records = this.records.filter((r) => r.id !== id);
  }

  async saveAttendanceBatch(
    recordsToSave: DailyAttendanceRecord[],
    recordIdsToDelete: string[],
    updatedSubjects: Subject[]
  ): Promise<void> {
    // Delete
    const deleteSet = new Set(recordIdsToDelete);
    this.records = this.records.filter((r) => !deleteSet.has(r.id));

    // Upsert records
    for (const rec of recordsToSave) {
      const idx = this.records.findIndex((r) => r.id === rec.id);
      if (idx >= 0) {
        this.records[idx] = rec;
      } else {
        this.records.push(rec);
      }
    }

    // Upsert subjects
    for (const subj of updatedSubjects) {
      const idx = this.subjects.findIndex((s) => s.id === subj.id);
      if (idx >= 0) {
        this.subjects[idx] = subj;
      } else {
        this.subjects.push(subj);
      }
    }
  }

  async getSettings(): Promise<AppSettings> {
    return { ...this.settings };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    this.settings = { ...settings };
  }

  async exportData(): Promise<BackupData> {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      settings: this.settings,
      semesters: this.semesters,
      subjects: this.subjects,
      attendanceRecords: this.records,
    };
  }

  async importData(data: BackupData): Promise<void> {
    this.settings = data.settings;
    this.semesters = data.semesters;
    this.subjects = data.subjects;
    this.records = data.attendanceRecords;
  }

  async clearAllData(): Promise<void> {
    this.semesters = [];
    this.subjects = [];
    this.records = [];
    this.settings = { ...DEFAULT_SETTINGS };
  }
}
