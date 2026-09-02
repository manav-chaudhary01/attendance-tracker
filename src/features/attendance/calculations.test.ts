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
      // 3/4 = 75%, target 75% -> 0 classes needed
      expect(calculateClassesToRecover(4, 3, 75)).toBe(0);
      // 8/10 = 80%, target 75% -> 0 classes needed
      expect(calculateClassesToRecover(10, 8, 75)).toBe(0);
    });

    it('calculates recovery classes when below target', () => {
      // 2/4 = 50%, target 75%
      // (2 + x) / (4 + x) >= 0.75 => 2 + x >= 3 + 0.75x => 0.25x >= 1 => x >= 4
      // Verification: (2+4)/(4+4) = 6/8 = 75%
      expect(calculateClassesToRecover(4, 2, 75)).toBe(4);

      // 6/10 = 60%, target 75%
      // (6 + x) / (10 + x) >= 0.75 => 6 + x >= 7.5 + 0.75x => 0.25x >= 1.5 => x >= 6
      // Verification: (6+6)/(10+6) = 12/16 = 75%
      expect(calculateClassesToRecover(10, 6, 75)).toBe(6);

      // 7/10 = 70%, target 75%
      // (7 + x) / (10 + x) >= 0.75 => 7 + x >= 7.5 + 0.75x => 0.25x >= 0.5 => x >= 2
      // Verification: (7+2)/(10+2) = 9/12 = 75%
      expect(calculateClassesToRecover(10, 7, 75)).toBe(2);

      // 1/2 = 50%, target 80%
      // (1 + x) / (2 + x) >= 0.8 => 1 + x >= 1.6 + 0.8x => 0.2x >= 0.6 => x >= 3
      // Verification: (1+3)/(2+3) = 4/5 = 80%
      expect(calculateClassesToRecover(2, 1, 80)).toBe(3);
    });

    it('handles floating point precision boundary cases', () => {
      // 14/20 = 70%, target 75% -> x = (0.75*20 - 14)/(0.25) = (15 - 14)/0.25 = 4
      // (14+4)/(20+4) = 18/24 = 0.75
      expect(calculateClassesToRecover(20, 14, 75)).toBe(4);

      // 74 out of 100, target 75% -> x = (75 - 74)/0.25 = 4
      // (74+4)/(100+4) = 78/104 = 0.75
      expect(calculateClassesToRecover(100, 74, 75)).toBe(4);
    });

    it('handles target of 0%', () => {
      expect(calculateClassesToRecover(10, 0, 0)).toBe(0);
      expect(calculateClassesToRecover(0, 0, 0)).toBe(0);
    });

    it('handles target of 100%', () => {
      // If 10/10 attended, target 100% -> 0 needed
      expect(calculateClassesToRecover(10, 10, 100)).toBe(0);

      // If even 1 class missed (e.g. 9/10), 100% is impossible for any finite x
      // (9+x)/(10+x) < 1 always
      expect(calculateClassesToRecover(10, 9, 100)).toBeNull();
      expect(calculateClassesToRecover(1, 0, 100)).toBeNull();
    });
  });

  describe('Maximum safe bunks (calculateSafeBunks)', () => {
    it('returns 0 when classes held is 0', () => {
      expect(calculateSafeBunks(0, 0, 75)).toBe(0);
    });

    it('returns 0 when already below target', () => {
      // 6/10 = 60% < 75%
      expect(calculateSafeBunks(10, 6, 75)).toBe(0);
      // 0/1 = 0% < 75%
      expect(calculateSafeBunks(1, 0, 75)).toBe(0);
    });

    it('returns 0 when exactly at target and 1 bunk drops it below', () => {
      // 3/4 = 75%. Bunking 1 gives 3/5 = 60% < 75%
      expect(calculateSafeBunks(4, 3, 75)).toBe(0);

      // 15/20 = 75%. Bunking 1 gives 15/21 = 71.4% < 75%
      expect(calculateSafeBunks(20, 15, 75)).toBe(0);
    });

    it('calculates safe bunks accurately when above target', () => {
      // 8/8 = 100%, target 75%
      // 8 / (8 + b) >= 0.75 => 8 >= 6 + 0.75b => 2 >= 0.75b => b <= 2.666 => b = 2
      // Check: b=2 => 8/10 = 80% (>= 75%). b=3 => 8/11 = 72.7% (< 75%)
      expect(calculateSafeBunks(8, 8, 75)).toBe(2);

      // 16/16 = 100%, target 75%
      // 16 / (16 + b) >= 0.75 => 16 >= 12 + 0.75b => 4 >= 0.75b => b <= 5.333 => b = 5
      // Check: b=5 => 16/21 = 76.19% (>=75%). b=6 => 16/22 = 72.7% (< 75%)
      expect(calculateSafeBunks(16, 16, 75)).toBe(5);

      // 18/20 = 90%, target 75%
      // 18 / (20 + b) >= 0.75 => 18 >= 15 + 0.75b => 3 >= 0.75b => b <= 4
      // Check: b=4 => 18/24 = 75% (>= 75%). b=5 => 18/25 = 72% (< 75%)
      expect(calculateSafeBunks(20, 18, 75)).toBe(4);
    });

    it('returns Infinity for target of 0%', () => {
      expect(calculateSafeBunks(10, 5, 0)).toBe(Infinity);
      expect(calculateSafeBunks(0, 0, 0)).toBe(Infinity);
    });

    it('handles 100% target correctly', () => {
      // At 100%, missing even 1 class drops attendance below 100%
      expect(calculateSafeBunks(10, 10, 100)).toBe(0);
      expect(calculateSafeBunks(10, 9, 100)).toBe(0);
    });
  });

  describe('Remaining classes feasibility (calculateRemainingClassesFeasibility)', () => {
    it('correctly assesses feasibility when target can still be met', () => {
      // Held 20, Attended 12 (60%), target 75%, Remaining 20 classes
      // Total classes will be 40. Target 75% of 40 = 30.
      // Current attended = 12. Must attend 30 - 12 = 18 classes out of 20.
      // Safe bunks out of 20 = 20 - 18 = 2 bunks.
      const res = calculateRemainingClassesFeasibility(20, 12, 75, 20);
      expect(res.isAchievable).toBe(true);
      expect(res.totalClassesWillBeHeld).toBe(40);
      expect(res.maxAchievableAttendance).toBe(80); // (12+20)/40 = 32/40 = 80%
      expect(res.minClassesMustAttend).toBe(18);
      expect(res.maxSafeBunksBeforeExam).toBe(2);
    });

    it('correctly assesses ineligibility when target cannot be met even attending all remaining', () => {
      // Held 20, Attended 10 (50%), target 75%, Remaining 5 classes
      // Total classes will be 25. Attending all 5 gives 15/25 = 60% < 75%.
      const res = calculateRemainingClassesFeasibility(20, 10, 75, 5);
      expect(res.isAchievable).toBe(false);
      expect(res.totalClassesWillBeHeld).toBe(25);
      expect(res.maxAchievableAttendance).toBe(60);
      expect(res.maxSafeBunksBeforeExam).toBe(0);
    });

    it('handles case where student must attend all remaining classes exactly', () => {
      // Held 20, Attended 10 (50%), target 75%, Remaining 20 classes
      // Total classes will be 40. 75% of 40 = 30. Attending all 20 gives 30/40 = 75%.
      const res = calculateRemainingClassesFeasibility(20, 10, 75, 20);
      expect(res.isAchievable).toBe(true);
      expect(res.minClassesMustAttend).toBe(20);
      expect(res.maxSafeBunksBeforeExam).toBe(0);
    });

    it('handles zero remaining classes', () => {
      // Held 20, Attended 15 (75%), target 75%, Remaining 0
      const res = calculateRemainingClassesFeasibility(20, 15, 75, 0);
      expect(res.isAchievable).toBe(true);
      expect(res.minClassesMustAttend).toBe(0);
      expect(res.maxSafeBunksBeforeExam).toBe(0);

      // Held 20, Attended 14 (70%), target 75%, Remaining 0
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
      // Subject A: 4 held, 4 attended (100%)
      // Subject B: 100 held, 50 attended (50%)
      // Unweighted average would be (100 + 50)/2 = 75%
      // Weighted sum: 54 / 104 = 51.92%
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
