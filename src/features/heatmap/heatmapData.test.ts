import { describe, it, expect } from 'vitest';
import { buildYearlyHeatmapData } from './heatmapData';
import { DailyAttendanceRecord } from '../../types/attendance';
import { Subject } from '../../types/subject';

describe('Yearly Heatmap Data Calculation Engine', () => {
  const subjects: Subject[] = [
    {
      id: 'sub-math',
      semesterId: 'sem-1',
      name: 'Mathematics',
      subjectCode: 'MATH101',
      attendanceTarget: 75,
      trackingMode: 'daily',
      totalClassesHeld: 10,
      totalClassesAttended: 8,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'sub-cs',
      semesterId: 'sem-1',
      name: 'Computer Science',
      subjectCode: 'CS102',
      attendanceTarget: 80,
      trackingMode: 'daily',
      totalClassesHeld: 5,
      totalClassesAttended: 5,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  it('generates a full 7-row weekly grid for the year', () => {
    const data = buildYearlyHeatmapData({
      year: 2026,
      records: [],
      subjects,
      today: '2026-10-24',
      weekStartsOn: 1, // Monday
    });

    expect(data.year).toBe(2026);
    expect(data.weeks.length).toBeGreaterThanOrEqual(52);
    expect(data.weeks.length).toBeLessThanOrEqual(54);

    // Every week must have exactly 7 days
    for (const week of data.weeks) {
      expect(week.days.length).toBe(7);
    }

    // Verify weekday labels
    expect(data.weekdayLabels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

    // Total in-year days must equal 365 for non-leap year 2026
    const inYearDays = data.weeks.flatMap((w) => w.days).filter((d) => d.inYear);
    expect(inYearDays.length).toBe(365);
    expect(inYearDays[0]!.date).toBe('2026-01-01');
    expect(inYearDays[inYearDays.length - 1]!.date).toBe('2026-12-31');
  });

  it('correctly handles leap years with 366 in-year days', () => {
    const data = buildYearlyHeatmapData({
      year: 2024,
      records: [],
      subjects,
      today: '2024-10-24',
    });

    const inYearDays = data.weeks.flatMap((w) => w.days).filter((d) => d.inYear);
    expect(inYearDays.length).toBe(366);
    expect(inYearDays.some((d) => d.date === '2024-02-29')).toBe(true);
  });

  it('never infers that a class was held or missed merely because a date has no record', () => {
    const data = buildYearlyHeatmapData({
      year: 2026,
      records: [],
      subjects,
      today: '2026-10-24',
    });

    const inYearDays = data.weeks.flatMap((w) => w.days).filter((d) => d.inYear);
    const pastUnrecorded = inYearDays.find((d) => d.date === '2026-05-15');

    expect(pastUnrecorded).toBeDefined();
    expect(pastUnrecorded?.status).toBe('unrecorded');
    expect(pastUnrecorded?.classesHeld).toBe(0);
    expect(pastUnrecorded?.classesAttended).toBe(0);
    expect(pastUnrecorded?.classesMissed).toBe(0);
    expect(pastUnrecorded?.intensity).toBe(0);
    expect(pastUnrecorded?.ariaLabel).toContain('No classes recorded');
  });

  it('distinguishes future dates and locks them from being treated as attendance days', () => {
    const data = buildYearlyHeatmapData({
      year: 2026,
      records: [],
      subjects,
      today: '2026-10-24',
    });

    const inYearDays = data.weeks.flatMap((w) => w.days).filter((d) => d.inYear);
    const futureDay = inYearDays.find((d) => d.date === '2026-11-10');

    expect(futureDay?.isFuture).toBe(true);
    expect(futureDay?.status).toBe('future');
    expect(futureDay?.intensity).toBe(0);
    expect(futureDay?.ariaLabel).toContain('Future date');
  });

  it('accurately categorizes full attendance, partial attendance, and zero attendance', () => {
    const records: DailyAttendanceRecord[] = [
      // Full attendance on 2026-03-10: 2 attended of 2 held
      {
        id: 'r1',
        subjectId: 'sub-math',
        date: '2026-03-10',
        classesHeld: 2,
        classesAttended: 2,
        createdAt: '2026-03-10T10:00:00Z',
        updatedAt: '2026-03-10T10:00:00Z',
      },
      // Partial attendance on 2026-03-11: 1 attended of 2 held
      {
        id: 'r2',
        subjectId: 'sub-math',
        date: '2026-03-11',
        classesHeld: 2,
        classesAttended: 1,
        createdAt: '2026-03-11T10:00:00Z',
        updatedAt: '2026-03-11T10:00:00Z',
      },
      // Zero attendance on 2026-03-12: 0 attended of 2 held (bunked/missed)
      {
        id: 'r3',
        subjectId: 'sub-math',
        date: '2026-03-12',
        classesHeld: 2,
        classesAttended: 0,
        createdAt: '2026-03-12T10:00:00Z',
        updatedAt: '2026-03-12T10:00:00Z',
      },
    ];

    const data = buildYearlyHeatmapData({
      year: 2026,
      records,
      subjects,
      today: '2026-10-24',
    });

    const inYearDays = data.weeks.flatMap((w) => w.days).filter((d) => d.inYear);

    const fullDay = inYearDays.find((d) => d.date === '2026-03-10')!;
    expect(fullDay.status).toBe('full_attendance');
    expect(fullDay.classesHeld).toBe(2);
    expect(fullDay.classesAttended).toBe(2);
    expect(fullDay.classesMissed).toBe(0);
    expect(fullDay.attendancePercentage).toBe(100);
    expect(fullDay.intensity).toBeGreaterThan(0);

    const partialDay = inYearDays.find((d) => d.date === '2026-03-11')!;
    expect(partialDay.status).toBe('partial_attendance');
    expect(partialDay.classesHeld).toBe(2);
    expect(partialDay.classesAttended).toBe(1);
    expect(partialDay.classesMissed).toBe(1);
    expect(partialDay.attendancePercentage).toBe(50);

    const zeroDay = inYearDays.find((d) => d.date === '2026-03-12')!;
    expect(zeroDay.status).toBe('zero_attendance');
    expect(zeroDay.classesHeld).toBe(2);
    expect(zeroDay.classesAttended).toBe(0);
    expect(zeroDay.classesMissed).toBe(2);
    expect(zeroDay.attendancePercentage).toBe(0);
    expect(zeroDay.intensity).toBe(0); // Zero attendance gets level 0 + alert styling
    expect(zeroDay.ariaLabel).toContain('all classes missed');
  });

  it('aggregates multiple subjects on the same date accurately', () => {
    const records: DailyAttendanceRecord[] = [
      {
        id: 'r-math',
        subjectId: 'sub-math',
        date: '2026-04-15',
        classesHeld: 1,
        classesAttended: 1,
        notes: 'Calculus lecture',
        createdAt: '2026-04-15T10:00:00Z',
        updatedAt: '2026-04-15T10:00:00Z',
      },
      {
        id: 'r-cs',
        subjectId: 'sub-cs',
        date: '2026-04-15',
        classesHeld: 2,
        classesAttended: 1,
        notes: 'Data structures lab',
        createdAt: '2026-04-15T10:00:00Z',
        updatedAt: '2026-04-15T10:00:00Z',
      },
    ];

    const data = buildYearlyHeatmapData({
      year: 2026,
      records,
      subjects,
      today: '2026-10-24',
    });

    const day = data.weeks.flatMap((w) => w.days).find((d) => d.date === '2026-04-15')!;
    expect(day.classesHeld).toBe(3); // 1 + 2
    expect(day.classesAttended).toBe(2); // 1 + 1
    expect(day.classesMissed).toBe(1);
    expect(day.status).toBe('partial_attendance');
    expect(day.records.length).toBe(2);
    expect(day.records[0]!.subjectName).toBe('Mathematics');
    expect(day.records[1]!.subjectName).toBe('Computer Science');
  });

  it('computes annual summary statistics and streaks correctly', () => {
    const records: DailyAttendanceRecord[] = [
      // 3 consecutive days with attendance: Oct 20, 21, 22
      {
        id: 's1',
        subjectId: 'sub-math',
        date: '2026-10-20',
        classesHeld: 1,
        classesAttended: 1,
        createdAt: '2026-10-20T10:00:00Z',
        updatedAt: '2026-10-20T10:00:00Z',
      },
      {
        id: 's2',
        subjectId: 'sub-math',
        date: '2026-10-21',
        classesHeld: 2,
        classesAttended: 2,
        createdAt: '2026-10-21T10:00:00Z',
        updatedAt: '2026-10-21T10:00:00Z',
      },
      {
        id: 's3',
        subjectId: 'sub-math',
        date: '2026-10-22',
        classesHeld: 1,
        classesAttended: 1,
        createdAt: '2026-10-22T10:00:00Z',
        updatedAt: '2026-10-22T10:00:00Z',
      },
      // Day 4 has 0 attended
      {
        id: 's4',
        subjectId: 'sub-math',
        date: '2026-10-23',
        classesHeld: 1,
        classesAttended: 0,
        createdAt: '2026-10-23T10:00:00Z',
        updatedAt: '2026-10-23T10:00:00Z',
      },
    ];

    const data = buildYearlyHeatmapData({
      year: 2026,
      records,
      subjects,
      today: '2026-10-24',
    });

    expect(data.summary.totalClassesHeld).toBe(5);
    expect(data.summary.totalClassesAttended).toBe(4);
    expect(data.summary.totalClassesMissed).toBe(1);
    expect(data.summary.overallPercentage).toBe(80);
    expect(data.summary.activeDaysCount).toBe(3);
    expect(data.summary.totalRecordedDays).toBe(4);
    expect(data.summary.longestStreak).toBe(3);
  });

  it('generates 12 month headers aligned with column weeks', () => {
    const data = buildYearlyHeatmapData({
      year: 2026,
      records: [],
      subjects,
      today: '2026-10-24',
    });

    expect(data.monthHeaders.length).toBe(12);
    expect(data.monthHeaders[0]!.name).toBe('Jan');
    expect(data.monthHeaders[0]!.weekIndex).toBe(0);
    expect(data.monthHeaders[11]!.name).toBe('Dec');
    expect(data.monthHeaders[11]!.weekIndex).toBeGreaterThan(45);
  });
});
