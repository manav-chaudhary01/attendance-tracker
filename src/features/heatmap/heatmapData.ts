import { DailyAttendanceRecord } from '../../types/attendance';
import { Subject } from '../../types/subject';
import {
  getDaysInYear,
  getDayOfWeek,
  getMonthName,
  getTodayLocalDateString,
  isFutureDate,
  addDays,
  formatDateForDisplay,
} from '../../utils/dates';
import { formatAttendancePercentage } from '../attendance/calculations';

export type HeatmapDayStatus =
  | 'future'
  | 'unrecorded'
  | 'no_class'
  | 'full_attendance'
  | 'partial_attendance'
  | 'zero_attendance';

export interface HeatmapDayRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  classesHeld: number;
  classesAttended: number;
  classesMissed: number;
  notes?: string;
}

export interface HeatmapDayCell {
  date: string; // YYYY-MM-DD
  inYear: boolean;
  dayOfWeek: number; // 0-6 row index in grid
  weekIndex: number; // 0-52 column index in grid
  isFuture: boolean;
  isToday: boolean;
  status: HeatmapDayStatus;
  classesHeld: number;
  classesAttended: number;
  classesMissed: number;
  attendancePercentage: number | null;
  intensity: 0 | 1 | 2 | 3 | 4;
  records: HeatmapDayRecord[];
  ariaLabel: string;
}

export interface HeatmapWeek {
  weekIndex: number;
  days: HeatmapDayCell[]; // Always length 7
}

export interface HeatmapMonthHeader {
  name: string;
  weekIndex: number;
}

export interface HeatmapSummary {
  year: number;
  totalClassesHeld: number;
  totalClassesAttended: number;
  totalClassesMissed: number;
  overallPercentage: number | null;
  activeDaysCount: number; // Days with at least 1 attended class
  totalRecordedDays: number; // Days with classes held > 0
  currentStreak: number;
  longestStreak: number;
}

export interface YearlyHeatmapData {
  year: number;
  weeks: HeatmapWeek[];
  monthHeaders: HeatmapMonthHeader[];
  summary: HeatmapSummary;
  weekdayLabels: string[];
}

export interface BuildHeatmapOptions {
  year: number;
  records: DailyAttendanceRecord[];
  subjects: Subject[];
  today?: string;
  weekStartsOn?: 0 | 1; // 0 for Sunday, 1 for Monday (default 1)
}

/**
 * Builds the complete GitHub-style contribution calendar grid and summary statistics
 * for a specific calendar year.
 */
export function buildYearlyHeatmapData({
  year,
  records,
  subjects,
  today = getTodayLocalDateString(),
  weekStartsOn = 1,
}: BuildHeatmapOptions): YearlyHeatmapData {
  const subjectMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));

  // Group records by local date
  const recordsByDate = new Map<string, DailyAttendanceRecord[]>();
  for (const rec of records) {
    if (rec.date.startsWith(`${year}-`)) {
      const existing = recordsByDate.get(rec.date) || [];
      existing.push(rec);
      recordsByDate.set(rec.date, existing);
    }
  }

  // Get all calendar days in the year
  const daysInYear = getDaysInYear(year);

  // First pass: aggregate daily stats to calculate max classes attended in a day (for intensity scaling)
  let maxAttendedInDay = 0;
  const rawDayData = new Map<
    string,
    {
      held: number;
      attended: number;
      dayRecords: HeatmapDayRecord[];
    }
  >();

  for (const dateStr of daysInYear) {
    const dayRecs = recordsByDate.get(dateStr) || [];
    let held = 0;
    let attended = 0;
    const dayRecords: HeatmapDayRecord[] = [];

    for (const rec of dayRecs) {
      const sub = subjectMap.get(rec.subjectId);
      const subName = sub?.name || 'Unknown Subject';
      const subCode = sub?.subjectCode;
      const missed = Math.max(0, rec.classesHeld - rec.classesAttended);

      held += rec.classesHeld;
      attended += rec.classesAttended;

      dayRecords.push({
        id: rec.id,
        subjectId: rec.subjectId,
        subjectName: subName,
        subjectCode: subCode,
        classesHeld: rec.classesHeld,
        classesAttended: rec.classesAttended,
        classesMissed: missed,
        notes: rec.notes,
      });
    }

    if (attended > maxAttendedInDay) {
      maxAttendedInDay = attended;
    }

    rawDayData.set(dateStr, { held, attended, dayRecords });
  }

  // Weekday labels based on weekStartsOn
  const weekdayLabels =
    weekStartsOn === 1
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Helper to map calendar dayOfWeek (0=Sun..6=Sat) to grid row index (0..6)
  const getRowIndex = (calendarDow: number): number => {
    if (weekStartsOn === 1) {
      // 0 (Sun) -> 6, 1 (Mon) -> 0, ..., 6 (Sat) -> 5
      return (calendarDow + 6) % 7;
    }
    return calendarDow;
  };

  // Helper to determine intensity level 0-4
  const calculateIntensity = (
    attended: number,
    held: number,
    isFuture: boolean
  ): 0 | 1 | 2 | 3 | 4 => {
    if (isFuture || held === 0 || attended === 0) {
      return 0;
    }
    if (maxAttendedInDay <= 1) {
      return 4;
    }
    if (maxAttendedInDay <= 4) {
      return Math.min(4, Math.max(1, attended)) as 1 | 2 | 3 | 4;
    }
    const ratio = attended / maxAttendedInDay;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  // Build grid weeks
  const weeks: HeatmapWeek[] = [];
  let currentWeekDays: HeatmapDayCell[] = [];
  let currentWeekIndex = 0;

  // Align first week: fill leading placeholder days before Jan 1
  const jan1Dow = getDayOfWeek(`${year}-01-01`);
  const jan1Row = getRowIndex(jan1Dow);

  for (let r = 0; r < jan1Row; r++) {
    const fillerDate = addDays(`${year}-01-01`, -(jan1Row - r));
    currentWeekDays.push({
      date: fillerDate,
      inYear: false,
      dayOfWeek: r,
      weekIndex: currentWeekIndex,
      isFuture: isFutureDate(fillerDate, today),
      isToday: fillerDate === today,
      status: 'unrecorded',
      classesHeld: 0,
      classesAttended: 0,
      classesMissed: 0,
      attendancePercentage: null,
      intensity: 0,
      records: [],
      ariaLabel: `${formatDateForDisplay(fillerDate)}: Outside year ${year}`,
    });
  }

  // Iterate over each day of the year
  for (const dateStr of daysInYear) {
    const calendarDow = getDayOfWeek(dateStr);
    const row = getRowIndex(calendarDow);
    const isFuture = isFutureDate(dateStr, today);
    const isDateToday = dateStr === today;
    const { held, attended, dayRecords } = rawDayData.get(dateStr)!;
    const missed = Math.max(0, held - attended);
    const pct = held > 0 ? (attended / held) * 100 : null;

    let status: HeatmapDayStatus = 'unrecorded';
    if (isFuture) {
      status = 'future';
    } else if (dayRecords.length === 0) {
      status = 'unrecorded';
    } else if (held === 0) {
      status = 'no_class';
    } else if (attended === held) {
      status = 'full_attendance';
    } else if (attended === 0) {
      status = 'zero_attendance';
    } else {
      status = 'partial_attendance';
    }

    const intensity = calculateIntensity(attended, held, isFuture);

    // Build accessible aria-label
    let ariaLabel = formatDateForDisplay(dateStr);
    if (isFuture) {
      ariaLabel += ': Future date';
    } else if (status === 'unrecorded') {
      ariaLabel += ': No classes recorded';
    } else if (status === 'no_class') {
      ariaLabel += ': No classes scheduled';
    } else {
      const pctStr = pct !== null ? `${formatAttendancePercentage(pct)}%` : '0%';
      ariaLabel += `: ${attended} of ${held} classes attended (${pctStr})`;
      if (status === 'zero_attendance') {
        ariaLabel += ' - all classes missed';
      }
    }

    currentWeekDays.push({
      date: dateStr,
      inYear: true,
      dayOfWeek: row,
      weekIndex: currentWeekIndex,
      isFuture,
      isToday: isDateToday,
      status,
      classesHeld: held,
      classesAttended: attended,
      classesMissed: missed,
      attendancePercentage: pct,
      intensity,
      records: dayRecords,
      ariaLabel,
    });

    if (row === 6) {
      // Completed a 7-day week column
      weeks.push({
        weekIndex: currentWeekIndex,
        days: currentWeekDays,
      });
      currentWeekDays = [];
      currentWeekIndex++;
    }
  }

  // Trailing filler days after Dec 31
  if (currentWeekDays.length > 0) {
    const remainingSlots = 7 - currentWeekDays.length;
    const dec31 = `${year}-12-31`;
    for (let r = 0; r < remainingSlots; r++) {
      const fillerDate = addDays(dec31, r + 1);
      const row = currentWeekDays.length;
      currentWeekDays.push({
        date: fillerDate,
        inYear: false,
        dayOfWeek: row,
        weekIndex: currentWeekIndex,
        isFuture: isFutureDate(fillerDate, today),
        isToday: fillerDate === today,
        status: 'unrecorded',
        classesHeld: 0,
        classesAttended: 0,
        classesMissed: 0,
        attendancePercentage: null,
        intensity: 0,
        records: [],
        ariaLabel: `${formatDateForDisplay(fillerDate)}: Outside year ${year}`,
      });
    }
    weeks.push({
      weekIndex: currentWeekIndex,
      days: currentWeekDays,
    });
  }

  // Month headers aligned by weekIndex
  const monthHeaders: HeatmapMonthHeader[] = [];
  for (let m = 0; m < 12; m++) {
    const monthFirstDay = `${year}-${String(m + 1).padStart(2, '0')}-01`;
    // Find week containing this date
    let targetWeekIndex = 0;
    for (const w of weeks) {
      if (w.days.some((d) => d.date === monthFirstDay && d.inYear)) {
        targetWeekIndex = w.weekIndex;
        break;
      }
    }
    monthHeaders.push({
      name: getMonthName(m, 'short'),
      weekIndex: targetWeekIndex,
    });
  }

  // Summary statistics calculation
  let totalClassesHeld = 0;
  let totalClassesAttended = 0;
  let activeDaysCount = 0;
  let totalRecordedDays = 0;

  // Streak calculations
  let longestStreak = 0;
  let currentStreakRun = 0;
  const attendedDatesSet = new Set<string>();

  for (const dateStr of daysInYear) {
    const data = rawDayData.get(dateStr);
    if (!data) continue;

    if (data.held > 0) {
      totalClassesHeld += data.held;
      totalClassesAttended += data.attended;
      totalRecordedDays++;
    }

    if (data.attended > 0) {
      activeDaysCount++;
      attendedDatesSet.add(dateStr);
    }
  }

  // Calculate streaks across chronological days
  for (const dateStr of daysInYear) {
    if (attendedDatesSet.has(dateStr)) {
      currentStreakRun++;
      if (currentStreakRun > longestStreak) {
        longestStreak = currentStreakRun;
      }
    } else {
      currentStreakRun = 0;
    }
  }

  // Current streak (ending at today or yesterday)
  let currentStreak = 0;
  let streakCheckDate = today;
  if (!attendedDatesSet.has(streakCheckDate)) {
    // Check yesterday in case today has not happened or not been recorded yet
    streakCheckDate = addDays(today, -1);
  }

  while (attendedDatesSet.has(streakCheckDate)) {
    currentStreak++;
    streakCheckDate = addDays(streakCheckDate, -1);
  }

  const totalClassesMissed = Math.max(0, totalClassesHeld - totalClassesAttended);
  const overallPercentage =
    totalClassesHeld > 0 ? (totalClassesAttended / totalClassesHeld) * 100 : null;

  return {
    year,
    weeks,
    monthHeaders,
    summary: {
      year,
      totalClassesHeld,
      totalClassesAttended,
      totalClassesMissed,
      overallPercentage,
      activeDaysCount,
      totalRecordedDays,
      currentStreak,
      longestStreak,
    },
    weekdayLabels,
  };
}
