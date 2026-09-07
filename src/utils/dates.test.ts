import { describe, it, expect } from 'vitest';
import {
  getTodayLocalDateString,
  isValidDateString,
  isFutureDate,
  isToday,
  addDays,
  formatDateForDisplay,
  getRelativeDateBadge,
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
});
