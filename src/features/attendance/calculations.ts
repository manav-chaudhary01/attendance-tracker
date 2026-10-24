import {
  EligibilityStatus,
  RemainingClassesFeasibility,
  SubjectAttendanceMetrics,
} from '../../types/attendance';

export const EPSILON = 1e-10;

/**
 * Validates that classes held and attended are non-negative integers
 * and that attended does not exceed held.
 */
export function validateCounts(classesHeld: number, classesAttended: number): void {
  if (!Number.isFinite(classesHeld) || !Number.isInteger(classesHeld) || classesHeld < 0) {
    throw new Error('Classes held must be a non-negative integer.');
  }
  if (!Number.isFinite(classesAttended) || !Number.isInteger(classesAttended) || classesAttended < 0) {
    throw new Error('Classes attended must be a non-negative integer.');
  }
  if (classesAttended > classesHeld) {
    throw new Error('Classes attended cannot exceed total classes held.');
  }
}

/**
 * Validates that attendance target percentage is a valid number between 0 and 100 inclusive.
 */
export function validateTarget(targetPercentage: number): void {
  if (typeof targetPercentage !== 'number' || !Number.isFinite(targetPercentage)) {
    throw new Error('Attendance target must be a valid number.');
  }
  if (targetPercentage < 0 || targetPercentage > 100) {
    throw new Error('Attendance target must be between 0% and 100% inclusive.');
  }
}

/**
 * Parses and validates an integer count from user form input string.
 * Returns either a valid integer or an error message.
 */
export function parseCountInput(
  value: string,
  fieldName: string = 'Count'
): { value: number | null; error?: string } {
  const trimmed = value.trim();
  if (trimmed === '') {
    return { value: null, error: `${fieldName} is required.` };
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return { value: null, error: `${fieldName} must be a whole number.` };
  }
  if (num < 0) {
    return { value: null, error: `${fieldName} cannot be negative.` };
  }
  return { value: num };
}

/**
 * Parses and validates a target percentage from user form input string.
 * Returns either a valid percentage number in [0, 100] or an error message.
 */
export function parseTargetInput(
  value: string,
  fieldName: string = 'Target'
): { value: number | null; error?: string } {
  const trimmed = value.trim();
  if (trimmed === '') {
    return { value: null, error: `${fieldName} is required.` };
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num)) {
    return { value: null, error: `${fieldName} must be a valid number.` };
  }
  if (num < 0 || num > 100) {
    return { value: null, error: `${fieldName} must be between 0% and 100%.` };
  }
  return { value: num };
}

/**
 * Calculates current attendance percentage.
 * Returns null if no classes have been held yet (classesHeld === 0)
 * to avoid falsely showing 0% when a course has not started.
 */
export function calculateCurrentPercentage(
  classesHeld: number,
  classesAttended: number
): number | null {
  validateCounts(classesHeld, classesAttended);
  if (classesHeld === 0) {
    return null;
  }
  return (classesAttended / classesHeld) * 100;
}

/**
 * Formats attendance percentage to avoid misleading rounding.
 * If attendance is strictly below target, it will never round up to display
 * the target percentage or higher.
 */
export function formatAttendancePercentage(
  percentage: number | null,
  options: { precision?: number; target?: number } = {}
): string {
  if (percentage === null) {
    return '—';
  }
  const precision = options.precision ?? 1;
  const formatted = percentage.toFixed(precision);

  // Guard against misleading rounding across the target threshold
  if (options.target !== undefined && percentage < options.target - EPSILON) {
    const roundedValue = parseFloat(formatted);
    if (roundedValue >= options.target) {
      // Truncate to prevent false eligibility display
      const factor = Math.pow(10, precision);
      const floored = (Math.floor(percentage * factor) / factor).toFixed(precision);
      return `${floored}%`;
    }
  }

  return `${formatted}%`;
}

/**
 * Projects the impact of attending vs missing the next class.
 */
export function calculateNextClassImpact(
  classesHeld: number,
  classesAttended: number
): {
  ifAttendedPercentage: number;
  ifMissedPercentage: number;
} {
  validateCounts(classesHeld, classesAttended);
  const nextHeld = classesHeld + 1;
  const ifAttendedPercentage = ((classesAttended + 1) / nextHeld) * 100;
  const ifMissedPercentage = (classesAttended / nextHeld) * 100;
  return {
    ifAttendedPercentage,
    ifMissedPercentage,
  };
}

/**
 * Calculates the minimum number of consecutive future classes that must be held and attended
 * to reach or exceed the target percentage.
 *
 * Inequality: (A + x) / (H + x) >= p
 * Returns:
 * - 0 if already at or above target
 * - null if target is mathematically unachievable (e.g. 100% target when at least 1 class has been missed)
 * - non-negative integer otherwise
 */
export function calculateClassesToRecover(
  classesHeld: number,
  classesAttended: number,
  targetPercentage: number
): number | null {
  validateCounts(classesHeld, classesAttended);
  validateTarget(targetPercentage);

  const p = targetPercentage / 100;

  // Target of 0% is trivially met by any attendance
  if (targetPercentage === 0) {
    return 0;
  }

  // If no classes have been held yet, 0 recovery needed (target not yet failed)
  if (classesHeld === 0) {
    return 0;
  }

  const currentFraction = classesAttended / classesHeld;
  if (currentFraction >= p - EPSILON) {
    return 0;
  }

  // Target of 100% when at least 1 class was missed:
  // (A + x)/(H + x) = 1 - (H - A)/(H + x) < 1 for all finite x >= 0.
  // It is mathematically impossible to recover to 100% once a class has been missed.
  if (targetPercentage === 100) {
    return null;
  }

  // Formula: x = ceil((p * H - A) / (1 - p))
  const rawX = (p * classesHeld - classesAttended) / (1 - p);
  let candidate = Math.max(0, Math.ceil(rawX - EPSILON));

  // Verify against inequality with numerical precision safety
  while ((classesAttended + candidate) / (classesHeld + candidate) < p - EPSILON) {
    candidate++;
  }
  while (
    candidate > 0 &&
    (classesAttended + (candidate - 1)) / (classesHeld + (candidate - 1)) >= p - EPSILON
  ) {
    candidate--;
  }

  return candidate;
}

/**
 * Calculates the maximum consecutive future classes that can be missed
 * while remaining at or above the configured target percentage.
 *
 * Each missed class increments classes held without incrementing classes attended.
 * Inequality: A / (H + b) >= p
 *
 * Returns:
 * - Infinity if target is 0%
 * - 0 if current attendance is below target or if missing even 1 class drops it below target
 * - Non-negative integer otherwise
 */
export function calculateSafeBunks(
  classesHeld: number,
  classesAttended: number,
  targetPercentage: number
): number {
  validateCounts(classesHeld, classesAttended);
  validateTarget(targetPercentage);

  if (targetPercentage === 0) {
    return Infinity;
  }

  if (classesHeld === 0) {
    return 0;
  }

  const p = targetPercentage / 100;
  const currentFraction = classesAttended / classesHeld;

  if (currentFraction < p - EPSILON) {
    return 0;
  }

  // Formula: b = floor(A / p - H)
  const rawB = classesAttended / p - classesHeld;
  let candidate = Math.max(0, Math.floor(rawB + EPSILON));

  // Verify against inequality with numerical precision safety
  while (candidate > 0 && classesAttended / (classesHeld + candidate) < p - EPSILON) {
    candidate--;
  }
  while (classesAttended / (classesHeld + (candidate + 1)) >= p - EPSILON) {
    candidate++;
  }

  return candidate;
}

/**
 * Evaluates whether eligibility is achievable given a known remaining class count before an exam,
 * and how many of those remaining classes must be attended or can be safely missed.
 */
export function calculateRemainingClassesFeasibility(
  classesHeld: number,
  classesAttended: number,
  targetPercentage: number,
  remainingClasses: number
): RemainingClassesFeasibility {
  validateCounts(classesHeld, classesAttended);
  validateTarget(targetPercentage);

  if (!Number.isFinite(remainingClasses) || !Number.isInteger(remainingClasses) || remainingClasses < 0) {
    throw new Error('Remaining classes count must be a non-negative integer.');
  }

  const totalClassesWillBeHeld = classesHeld + remainingClasses;
  if (totalClassesWillBeHeld === 0) {
    return {
      remainingClasses,
      totalClassesWillBeHeld: 0,
      maxAchievableAttendance: 0,
      isAchievable: targetPercentage === 0,
      minClassesMustAttend: 0,
      maxSafeBunksBeforeExam: 0,
      feasibilityDescription: 'No classes held or scheduled.',
    };
  }

  const p = targetPercentage / 100;
  const maxPossibleAttended = classesAttended + remainingClasses;
  const maxAchievableAttendance = (maxPossibleAttended / totalClassesWillBeHeld) * 100;

  const isAchievable = maxAchievableAttendance >= targetPercentage - EPSILON;

  if (!isAchievable) {
    return {
      remainingClasses,
      totalClassesWillBeHeld,
      maxAchievableAttendance,
      isAchievable: false,
      minClassesMustAttend: remainingClasses,
      maxSafeBunksBeforeExam: 0,
      feasibilityDescription: `Target unreachable: Even attending all ${remainingClasses} remaining classes yields max ${maxAchievableAttendance.toFixed(1)}%, below the ${targetPercentage}% target.`,
    };
  }

  // Find minimum attended k in [0, remainingClasses] such that (A + k) / totalClassesWillBeHeld >= p
  // A + k >= p * totalClassesWillBeHeld => k >= p * totalClassesWillBeHeld - A
  const rawK = p * totalClassesWillBeHeld - classesAttended;
  let minK = Math.max(0, Math.ceil(rawK - EPSILON));
  minK = Math.min(minK, remainingClasses);

  while (minK < remainingClasses && (classesAttended + minK) / totalClassesWillBeHeld < p - EPSILON) {
    minK++;
  }
  while (minK > 0 && (classesAttended + (minK - 1)) / totalClassesWillBeHeld >= p - EPSILON) {
    minK--;
  }

  const maxSafeBunksBeforeExam = remainingClasses - minK;

  return {
    remainingClasses,
    totalClassesWillBeHeld,
    maxAchievableAttendance,
    isAchievable: true,
    minClassesMustAttend: minK,
    maxSafeBunksBeforeExam,
    feasibilityDescription:
      maxSafeBunksBeforeExam > 0
        ? `You must attend at least ${minK} of ${remainingClasses} remaining classes. You can miss up to ${maxSafeBunksBeforeExam}.`
        : `You must attend all ${remainingClasses} remaining classes to maintain ${targetPercentage}% attendance.`,
  };
}

/**
 * Calculates complete attendance metrics and descriptions for a single subject.
 */
export function calculateSubjectMetrics(
  classesHeld: number,
  classesAttended: number,
  targetPercentage: number
): SubjectAttendanceMetrics {
  validateCounts(classesHeld, classesAttended);
  validateTarget(targetPercentage);

  const classesMissed = classesHeld - classesAttended;
  const currentPercentage = calculateCurrentPercentage(classesHeld, classesAttended);
  const classesToRecover = calculateClassesToRecover(classesHeld, classesAttended, targetPercentage);
  const safeBunkCount = calculateSafeBunks(classesHeld, classesAttended, targetPercentage);

  let status: EligibilityStatus = 'not_started';
  let statusDescription = 'No classes held yet.';

  if (classesHeld > 0 && currentPercentage !== null) {
    const isMeetingTarget = currentPercentage >= targetPercentage - EPSILON;

    if (isMeetingTarget) {
      status = 'eligible';
      if (safeBunkCount === Infinity) {
        statusDescription = 'Target is 0%. Attendance is always meeting target.';
      } else if (safeBunkCount === 0) {
        statusDescription = `On track (${currentPercentage.toFixed(1)}%). Missing the next class will drop attendance below ${targetPercentage}%.`;
      } else {
        statusDescription = `On track (${currentPercentage.toFixed(1)}%). You can safely miss ${safeBunkCount} consecutive class${safeBunkCount === 1 ? '' : 'es'}.`;
      }
    } else {
      // Below target
      if (classesToRecover === null) {
        status = 'ineligible';
        statusDescription = `Cannot recover to 100% target because ${classesMissed} class${classesMissed === 1 ? '' : 'es'} were already missed.`;
      } else {
        status = 'at_risk';
        statusDescription = `Below target (${currentPercentage.toFixed(1)}%). Attend next ${classesToRecover} consecutive class${classesToRecover === 1 ? '' : 'es'} to recover to ${targetPercentage}%.`;
      }
    }
  }

  return {
    classesHeld,
    classesAttended,
    classesMissed,
    currentPercentage,
    targetPercentage,
    status,
    classesToRecover,
    safeBunkCount,
    statusDescription,
  };
}

/**
 * Calculates overall semester attendance metrics from a list of subjects.
 * Sums actual classes attended divided by total classes held (weighted).
 */
export function calculateSemesterOverall(
  subjects: Array<{ totalClassesHeld: number; totalClassesAttended: number }>
): {
  totalClassesHeld: number;
  totalClassesAttended: number;
  totalClassesMissed: number;
  overallPercentage: number | null;
} {
  let totalClassesHeld = 0;
  let totalClassesAttended = 0;

  for (const sub of subjects) {
    validateCounts(sub.totalClassesHeld, sub.totalClassesAttended);
    totalClassesHeld += sub.totalClassesHeld;
    totalClassesAttended += sub.totalClassesAttended;
  }

  const totalClassesMissed = totalClassesHeld - totalClassesAttended;
  const overallPercentage =
    totalClassesHeld > 0 ? (totalClassesAttended / totalClassesHeld) * 100 : null;

  return {
    totalClassesHeld,
    totalClassesAttended,
    totalClassesMissed,
    overallPercentage,
  };
}
