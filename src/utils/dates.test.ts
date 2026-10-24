import { describe, it, expect } from 'vitest';
import {
  getTodayLocalDateString,
  isValidDateString,
  isFutureDate,
  isToday,
  addDays,
  formatDateForDisplay,
  getRelativeDateBadge,
  getDayOfWeek,
  getDaysInYear,
  getMonthName,
} from './dates';

describe('Date Utilities', () => {
  it('formats Date into local YYYY-MM-DD string accurately without UTC shift', () => {
    // Construct local date: 2026-10-24
    const d = new Date(2026, 9, 24, 23, 59, 59); // 11:59pm local
    expect(getTodayLocalDateString(d)).toBe('2026-10-24');

    const dMorning = new Date(2026, 9, 24, 0, 1, 0); // 12:01am local
    expect(getTodayLocalDateString(dMorning)).toBe('2026-10-24');
  });

  it('validates YYYY-MM-DD dates correctly', () => {
    expect(isValidDateString('2026-10-24')).toBe(true);
    expect(isValidDateString('2026-02-28')).toBe(true);
    expect(isValidDateString('2024-02-29')).toBe(true); // leap year
    expect(isValidDateString('2026-02-29')).toBe(false); // not leap year
    expect(isValidDateString('invalid')).toBe(false);
    expect(isValidDateString('2026-13-01')).toBe(false);
    expect(isValidDateString('2026-00-10')).toBe(false);
  });

  it('checks future dates relative to reference today', () => {
    const today = '2026-10-24';
    expect(isFutureDate('2026-10-25', today)).toBe(true);
    expect(isFutureDate('2026-10-24', today)).toBe(false);
    expect(isFutureDate('2026-10-23', today)).toBe(false);
  });

  it('identifies today accurately', () => {
    const today = '2026-10-24';
    expect(isToday('2026-10-24', today)).toBe(true);
    expect(isToday('2026-10-23', today)).toBe(false);
  });

  it('adds and subtracts days correctly across month boundaries', () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('provides relative badges for today and yesterday', () => {
    const today = '2026-10-24';
    expect(getRelativeDateBadge('2026-10-24', today)).toBe('Today');
    expect(getRelativeDateBadge('2026-10-23', today)).toBe('Yesterday');
    expect(getRelativeDateBadge('2026-10-25', today)).toBe('Tomorrow');
    expect(getRelativeDateBadge('2026-10-20', today)).toBeNull();
  });

  it('formats dates for display with day of week and month name', () => {
    const formatted = formatDateForDisplay('2026-10-24');
    expect(formatted).toContain('Oct');
    expect(formatted).toContain('24');
    expect(formatted).toContain('2026');
  });

  it('calculates day of week correctly (0 for Sunday, 6 for Saturday)', () => {
    // 2026-10-24 is a Saturday (6)
    expect(getDayOfWeek('2026-10-24')).toBe(6);
    // 2026-10-25 is a Sunday (0)
    expect(getDayOfWeek('2026-10-25')).toBe(0);
    // 2026-10-26 is a Monday (1)
    expect(getDayOfWeek('2026-10-26')).toBe(1);
  });

  it('generates all days of the year accounting for leap and normal years', () => {
    const leapDays = getDaysInYear(2024);
    expect(leapDays.length).toBe(366);
    expect(leapDays[0]).toBe('2024-01-01');
    expect(leapDays[leapDays.length - 1]).toBe('2024-12-31');
    expect(leapDays).toContain('2024-02-29');

    const normalDays = getDaysInYear(2026);
    expect(normalDays.length).toBe(365);
    expect(normalDays[0]).toBe('2026-01-01');
    expect(normalDays[normalDays.length - 1]).toBe('2026-12-31');
    expect(normalDays).not.toContain('2026-02-29');
  });

  it('provides localized short and long month names', () => {
    expect(getMonthName(0)).toBe('Jan');
    expect(getMonthName(9)).toBe('Oct');
    expect(getMonthName(9, 'long')).toBe('October');
  });
});
