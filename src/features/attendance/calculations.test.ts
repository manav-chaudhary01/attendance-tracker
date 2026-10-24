import { describe, it, expect } from 'vitest';
import {
  calculateCurrentPercentage,
  calculateClassesToRecover,
  calculateSafeBunks,
  calculateRemainingClassesFeasibility,
  calculateSubjectMetrics,
  calculateSemesterOverall,
  validateCounts,
  validateTarget,
  parseCountInput,
  parseTargetInput,
  formatAttendancePercentage,
  calculateNextClassImpact,
} from './calculations';

describe('Attendance Calculations Module', () => {
  describe('Input validation', () => {
    it('throws error on negative classes held', () => {
      expect(() => validateCounts(-1, 0)).toThrow('Classes held must be a non-negative integer.');
    });

    it('throws error on non-integer classes held or attended', () => {
      expect(() => validateCounts(10.5, 5)).toThrow('Classes held must be a non-negative integer.');
      expect(() => validateCounts(10, 4.2)).toThrow('Classes attended must be a non-negative integer.');
    });

    it('throws error on classes attended exceeding held', () => {
      expect(() => validateCounts(5, 6)).toThrow('Classes attended cannot exceed total classes held.');
    });

    it('validates target percentage range [0, 100]', () => {
      expect(() => validateTarget(-5)).toThrow('Attendance target must be between 0% and 100% inclusive.');
      expect(() => validateTarget(101)).toThrow('Attendance target must be between 0% and 100% inclusive.');
      expect(() => validateTarget(NaN)).toThrow('Attendance target must be a valid number.');
      expect(() => validateTarget(75)).not.toThrow();
      expect(() => validateTarget(0)).not.toThrow();
      expect(() => validateTarget(100)).not.toThrow();
      expect(() => validateTarget(75.5)).not.toThrow();
    });
  });

  describe('Form input parsing helpers', () => {
    it('parses valid count inputs', () => {
      expect(parseCountInput('20')).toEqual({ value: 20 });
      expect(parseCountInput(' 0 ')).toEqual({ value: 0 });
    });

    it('returns meaningful error on invalid count inputs', () => {
      expect(parseCountInput('', 'Classes held').error).toBe('Classes held is required.');
      expect(parseCountInput('-5', 'Classes held').error).toBe('Classes held cannot be negative.');
      expect(parseCountInput('3.5', 'Classes held').error).toBe('Classes held must be a whole number.');
      expect(parseCountInput('abc', 'Classes held').error).toBe('Classes held must be a whole number.');
    });

    it('parses valid target percentage inputs', () => {
      expect(parseTargetInput('75')).toEqual({ value: 75 });
      expect(parseTargetInput('75.5')).toEqual({ value: 75.5 });
      expect(parseTargetInput('0')).toEqual({ value: 0 });
      expect(parseTargetInput('100')).toEqual({ value: 100 });
    });

    it('returns meaningful error on invalid target percentage inputs', () => {
      expect(parseTargetInput('', 'Target').error).toBe('Target is required.');
      expect(parseTargetInput('-1', 'Target').error).toBe('Target must be between 0% and 100%.');
      expect(parseTargetInput('105', 'Target').error).toBe('Target must be between 0% and 100%.');
      expect(parseTargetInput('invalid', 'Target').error).toBe('Target must be a valid number.');
    });
  });

  describe('Attendance percentage formatting & guard against misleading rounding', () => {
    it('returns dash for null percentage', () => {
      expect(formatAttendancePercentage(null)).toBe('—');
    });

    it('formats standard percentages to 1 decimal place', () => {
      expect(formatAttendancePercentage(80)).toBe('80.0%');
      expect(formatAttendancePercentage(75.25)).toBe('75.3%');
    });

    it('prevents rounding up to target when student is actually below target', () => {
      // 74.96% with target 75%: standard toFixed(1) would round to 75.0%, misleading student!
      const formatted = formatAttendancePercentage(74.96, { precision: 1, target: 75 });
      expect(formatted).toBe('74.9%');
      expect(parseFloat(formatted)).toBeLessThan(75);
    });
  });

  describe('Next class impact projection', () => {
    it('calculates the impact of attending vs missing the next class', () => {
      // Held 4, Attended 3 (75%)
      // If attended: 4/5 = 80%
      // If missed: 3/5 = 60%
      const impact = calculateNextClassImpact(4, 3);
      expect(impact.ifAttendedPercentage).toBe(80);
      expect(impact.ifMissedPercentage).toBe(60);
    });
  });

  describe('Current attendance percentage', () => {
    it('returns null for zero classes held (does not show 0%)', () => {
      expect(calculateCurrentPercentage(0, 0)).toBeNull();
    });

    it('calculates correct percentages for valid inputs', () => {
      expect(calculateCurrentPercentage(10, 8)).toBe(80);
      expect(calculateCurrentPercentage(4, 3)).toBe(75);
      expect(calculateCurrentPercentage(10, 0)).toBe(0);
      expect(calculateCurrentPercentage(10, 10)).toBe(100);
    });

    it('handles repeating decimals accurately', () => {
      const pct = calculateCurrentPercentage(3, 1);
      expect(pct).toBeCloseTo(33.333, 2);
    });
  });

  describe('Classes required to recover (calculateClassesToRecover)', () => {
    it('returns 0 when zero classes have been held', () => {
      expect(calculateClassesToRecover(0, 0, 75)).toBe(0);
    });

    it('returns 0 when already meeting the target', () => {
      expect(calculateClassesToRecover(4, 3, 75)).toBe(0);
      expect(calculateClassesToRecover(10, 8, 75)).toBe(0);
    });

    it('calculates recovery classes when below target', () => {
      expect(calculateClassesToRecover(4, 2, 75)).toBe(4);
      expect(calculateClassesToRecover(10, 6, 75)).toBe(6);
      expect(calculateClassesToRecover(10, 7, 75)).toBe(2);
      expect(calculateClassesToRecover(2, 1, 80)).toBe(3);
    });

    it('handles floating point precision boundary cases', () => {
      expect(calculateClassesToRecover(20, 14, 75)).toBe(4);
      expect(calculateClassesToRecover(100, 74, 75)).toBe(4);
    });

    it('handles target of 0%', () => {
      expect(calculateClassesToRecover(10, 0, 0)).toBe(0);
      expect(calculateClassesToRecover(0, 0, 0)).toBe(0);
    });

    it('handles target of 100%', () => {
      expect(calculateClassesToRecover(10, 10, 100)).toBe(0);
      expect(calculateClassesToRecover(10, 9, 100)).toBeNull();
      expect(calculateClassesToRecover(1, 0, 100)).toBeNull();
    });
  });

  describe('Maximum safe bunks (calculateSafeBunks)', () => {
    it('returns 0 when classes held is 0', () => {
      expect(calculateSafeBunks(0, 0, 75)).toBe(0);
    });

    it('returns 0 when already below target', () => {
      expect(calculateSafeBunks(10, 6, 75)).toBe(0);
      expect(calculateSafeBunks(1, 0, 75)).toBe(0);
    });

    it('returns 0 when exactly at target and 1 bunk drops it below', () => {
      expect(calculateSafeBunks(4, 3, 75)).toBe(0);
      expect(calculateSafeBunks(20, 15, 75)).toBe(0);
    });

    it('calculates safe bunks accurately when above target', () => {
      expect(calculateSafeBunks(8, 8, 75)).toBe(2);
      expect(calculateSafeBunks(16, 16, 75)).toBe(5);
      expect(calculateSafeBunks(20, 18, 75)).toBe(4);
    });

    it('returns Infinity for target of 0%', () => {
      expect(calculateSafeBunks(10, 5, 0)).toBe(Infinity);
      expect(calculateSafeBunks(0, 0, 0)).toBe(Infinity);
    });

    it('handles 100% target correctly', () => {
      expect(calculateSafeBunks(10, 10, 100)).toBe(0);
      expect(calculateSafeBunks(10, 9, 100)).toBe(0);
    });
  });

  describe('Remaining classes feasibility (calculateRemainingClassesFeasibility)', () => {
    it('correctly assesses feasibility when target can still be met', () => {
      const res = calculateRemainingClassesFeasibility(20, 12, 75, 20);
      expect(res.isAchievable).toBe(true);
      expect(res.totalClassesWillBeHeld).toBe(40);
      expect(res.maxAchievableAttendance).toBe(80);
      expect(res.minClassesMustAttend).toBe(18);
      expect(res.maxSafeBunksBeforeExam).toBe(2);
    });

    it('correctly assesses ineligibility when target cannot be met even attending all remaining', () => {
      const res = calculateRemainingClassesFeasibility(20, 10, 75, 5);
      expect(res.isAchievable).toBe(false);
      expect(res.totalClassesWillBeHeld).toBe(25);
      expect(res.maxAchievableAttendance).toBe(60);
      expect(res.maxSafeBunksBeforeExam).toBe(0);
    });

    it('handles case where student must attend all remaining classes exactly', () => {
      const res = calculateRemainingClassesFeasibility(20, 10, 75, 20);
      expect(res.isAchievable).toBe(true);
      expect(res.minClassesMustAttend).toBe(20);
      expect(res.maxSafeBunksBeforeExam).toBe(0);
    });

    it('handles zero remaining classes', () => {
      const res = calculateRemainingClassesFeasibility(20, 15, 75, 0);
      expect(res.isAchievable).toBe(true);
      expect(res.minClassesMustAttend).toBe(0);
      expect(res.maxSafeBunksBeforeExam).toBe(0);

      const resFail = calculateRemainingClassesFeasibility(20, 14, 75, 0);
      expect(resFail.isAchievable).toBe(false);
    });
  });

  describe('Subject Attendance Metrics integration', () => {
    it('returns not_started status for subjects with 0 classes held', () => {
      const metrics = calculateSubjectMetrics(0, 0, 75);
      expect(metrics.status).toBe('not_started');
      expect(metrics.currentPercentage).toBeNull();
      expect(metrics.classesMissed).toBe(0);
      expect(metrics.classesToRecover).toBe(0);
    });

    it('returns eligible status with safe bunks when above target', () => {
      const metrics = calculateSubjectMetrics(20, 18, 75);
      expect(metrics.status).toBe('eligible');
      expect(metrics.currentPercentage).toBe(90);
      expect(metrics.classesMissed).toBe(2);
      expect(metrics.safeBunkCount).toBe(4);
      expect(metrics.classesToRecover).toBe(0);
    });

    it('returns at_risk status with recovery count when below target', () => {
      const metrics = calculateSubjectMetrics(10, 6, 75);
      expect(metrics.status).toBe('at_risk');
      expect(metrics.currentPercentage).toBe(60);
      expect(metrics.classesMissed).toBe(4);
      expect(metrics.classesToRecover).toBe(6);
      expect(metrics.safeBunkCount).toBe(0);
    });

    it('returns ineligible status when target is 100% and a class was missed', () => {
      const metrics = calculateSubjectMetrics(10, 9, 100);
      expect(metrics.status).toBe('ineligible');
      expect(metrics.classesToRecover).toBeNull();
      expect(metrics.statusDescription).toContain('Cannot recover to 100%');
    });
  });

  describe('Semester Overall calculation (weighted sum)', () => {
    it('calculates weighted attendance across subjects correctly', () => {
      const subjects = [
        { totalClassesHeld: 4, totalClassesAttended: 4 },
        { totalClassesHeld: 100, totalClassesAttended: 50 },
      ];
      const overall = calculateSemesterOverall(subjects);
      expect(overall.totalClassesHeld).toBe(104);
      expect(overall.totalClassesAttended).toBe(54);
      expect(overall.totalClassesMissed).toBe(50);
      expect(overall.overallPercentage).toBeCloseTo(51.923, 2);
    });

    it('returns null percentage when all subjects have 0 classes held', () => {
      const subjects = [
        { totalClassesHeld: 0, totalClassesAttended: 0 },
        { totalClassesHeld: 0, totalClassesAttended: 0 },
      ];
      const overall = calculateSemesterOverall(subjects);
      expect(overall.totalClassesHeld).toBe(0);
      expect(overall.totalClassesAttended).toBe(0);
      expect(overall.overallPercentage).toBeNull();
    });
  });
});
