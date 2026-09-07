/**
 * Date utilities for local calendar dates in YYYY-MM-DD format.
 * Strictly uses local device calendar components to prevent UTC conversion day-shifts.
 */

/**
 * Returns today's date in local calendar time as YYYY-MM-DD.
 */
export function getTodayLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates whether a string is a valid calendar date in YYYY-MM-DD format.
 */
export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  // Check valid days in month including leap years
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Checks if a YYYY-MM-DD string is in the future relative to local today.
 */
export function isFutureDate(dateStr: string, today: string = getTodayLocalDateString()): boolean {
  return dateStr > today;
}

/**
 * Checks if a YYYY-MM-DD string is today's local date.
 */
export function isToday(dateStr: string, today: string = getTodayLocalDateString()): boolean {
  return dateStr === today;
}

/**
 * Shifts a YYYY-MM-DD date by a given number of days.
 */
export function addDays(dateStr: string, days: number): string {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
  date.setDate(date.getDate() + days);
  return getTodayLocalDateString(date);
}

/**
 * Formats a YYYY-MM-DD date string for display (e.g. "Friday, Oct 24, 2026").
 */
export function formatDateForDisplay(
  dateStr: string,
  options: { includeWeekday?: boolean; includeYear?: boolean } = {}
): string {
  if (!isValidDateString(dateStr)) {
    return dateStr;
  }
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  if (options.includeWeekday ?? true) {
    formatOptions.weekday = 'short';
  }

  if (options.includeYear ?? true) {
    formatOptions.year = 'numeric';
  }

  return date.toLocaleDateString(undefined, formatOptions);
}

/**
 * Returns a friendly relative label if date is today or yesterday.
 */
export function getRelativeDateBadge(
  dateStr: string,
  today: string = getTodayLocalDateString()
): string | null {
  if (dateStr === today) {
    return 'Today';
  }
  const yesterday = addDays(today, -1);
  if (dateStr === yesterday) {
    return 'Yesterday';
  }
  const tomorrow = addDays(today, 1);
  if (dateStr === tomorrow) {
    return 'Tomorrow';
  }
  return null;
}
