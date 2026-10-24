export interface DailyAttendanceRecord {
  id: string;
  subjectId: string;
  date: string; // YYYY-MM-DD local calendar date
  classesHeld: number; // Non-negative integer
  classesAttended: number; // Non-negative integer, 0 <= classesAttended <= classesHeld
  notes?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export type CreateDailyAttendanceInput = Omit<DailyAttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateDailyAttendanceInput = Partial<Omit<DailyAttendanceRecord, 'id' | 'createdAt' | 'subjectId'>>;

export type EligibilityStatus = 
  | 'not_started' // No classes held yet
  | 'eligible'    // Current % >= target %
  | 'at_risk'     // Current % < target %, but recoverable with future attendance
  | 'ineligible'; // Current % < target %, mathematically impossible to recover (e.g. 100% target or exceeded remaining capacity)

export interface SubjectAttendanceMetrics {
  classesHeld: number;
  classesAttended: number;
  classesMissed: number;
  currentPercentage: number | null; // null if classesHeld === 0
  targetPercentage: number;
  status: EligibilityStatus;
  /**
   * Minimum number of future classes that must be consecutively held and attended to reach target.
   * null if already at or above target, or if mathematically impossible.
   */
  classesToRecover: number | null;
  /**
   * Maximum consecutive future classes that can be missed while remaining at or above the target.
   * Can be Infinity if target is 0%.
   */
  safeBunkCount: number;
  /**
   * Clear explanatory message describing the situation and calculation assumptions.
   */
  statusDescription: string;
}

export interface RemainingClassesFeasibility {
  remainingClasses: number;
  totalClassesWillBeHeld: number;
  maxAchievableAttendance: number; // Percentage if all remaining are attended
  isAchievable: boolean;
  minClassesMustAttend: number;
  maxSafeBunksBeforeExam: number;
  feasibilityDescription: string;
}
