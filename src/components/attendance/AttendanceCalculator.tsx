import React, { useState, useId } from 'react';
import {
  calculateSubjectMetrics,
  calculateRemainingClassesFeasibility,
  calculateNextClassImpact,
  formatAttendancePercentage,
  parseCountInput,
  parseTargetInput,
} from '../../features/attendance/calculations';
import { AttendanceProgress } from './AttendanceProgress';
import { AttendanceStatus } from './AttendanceStatus';
import { ArrowRight, Calculator, HelpCircle } from 'lucide-react';

interface AttendanceCalculatorProps {
  initialHeld?: number;
  initialAttended?: number;
  initialTarget?: number;
  className?: string;
}

export const AttendanceCalculator: React.FC<AttendanceCalculatorProps> = ({
  initialHeld = 20,
  initialAttended = 16,
  initialTarget = 75,
  className = '',
}) => {
  const heldInputId = useId();
  const attendedInputId = useId();
  const targetInputId = useId();
  const remainingInputId = useId();

  const [heldStr, setHeldStr] = useState<string>(String(initialHeld));
  const [attendedStr, setAttendedStr] = useState<string>(String(initialAttended));
  const [targetStr, setTargetStr] = useState<string>(String(initialTarget));
  const [remainingStr, setRemainingStr] = useState<string>('');

  // Parse and validate inputs
  const parsedHeld = parseCountInput(heldStr, 'Total classes held');
  const parsedAttended = parseCountInput(attendedStr, 'Classes attended');
  const parsedTarget = parseTargetInput(targetStr, 'Attendance target');
  const parsedRemaining =
    remainingStr.trim() === ''
      ? { value: null }
      : parseCountInput(remainingStr, 'Remaining classes');

  // Relational validation
  let relationalError: string | undefined;
  if (
    parsedHeld.value !== null &&
    parsedAttended.value !== null &&
    parsedAttended.value > parsedHeld.value
  ) {
    relationalError = 'Classes attended cannot exceed total classes held.';
  }

  const isValid =
    !parsedHeld.error &&
    !parsedAttended.error &&
    !parsedTarget.error &&
    !parsedRemaining.error &&
    !relationalError &&
    parsedHeld.value !== null &&
    parsedAttended.value !== null &&
    parsedTarget.value !== null;

  // Compute metrics if inputs are valid
  const metrics = isValid
    ? calculateSubjectMetrics(
        parsedHeld.value!,
        parsedAttended.value!,
        parsedTarget.value!
      )
    : null;

  const nextImpact =
    isValid && parsedHeld.value! > 0
      ? calculateNextClassImpact(parsedHeld.value!, parsedAttended.value!)
      : null;

  const feasibility =
    isValid && parsedRemaining.value !== null
      ? calculateRemainingClassesFeasibility(
          parsedHeld.value!,
          parsedAttended.value!,
          parsedTarget.value!,
          parsedRemaining.value!
        )
      : null;

  return (
    <div className={`bg-background border border-border rounded p-5 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-accent" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-charcoal">
            Attendance Recovery &amp; Target Calculator
          </h2>
        </div>
        {metrics && <AttendanceStatus status={metrics.status} variant="badge" />}
      </div>

      {/* Form Controls Grid */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Classes Held */}
          <div className="space-y-1">
            <label
              htmlFor={heldInputId}
              className="block text-xs font-medium text-charcoal"
            >
              Classes Held
            </label>
            <input
              id={heldInputId}
              type="number"
              min="0"
              step="1"
              value={heldStr}
              onChange={(e) => setHeldStr(e.target.value)}
              aria-invalid={Boolean(parsedHeld.error || relationalError)}
              aria-describedby={
                parsedHeld.error
                  ? `${heldInputId}-error`
                  : relationalError
                  ? `${heldInputId}-relational-error`
                  : undefined
              }
              className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded focus:border-accent text-charcoal tabular-nums outline-none"
            />
            {parsedHeld.error && (
              <span
                id={`${heldInputId}-error`}
                role="alert"
                className="text-[11px] text-[#a83232] block"
              >
                {parsedHeld.error}
              </span>
            )}
            {relationalError && !parsedHeld.error && (
              <span
                id={`${heldInputId}-relational-error`}
                role="alert"
                className="text-[11px] text-[#a83232] block"
              >
                {relationalError}
              </span>
            )}
          </div>

          {/* Classes Attended */}
          <div className="space-y-1">
            <label
              htmlFor={attendedInputId}
              className="block text-xs font-medium text-charcoal"
            >
              Classes Attended
            </label>
            <input
              id={attendedInputId}
              type="number"
              min="0"
              step="1"
              value={attendedStr}
              onChange={(e) => setAttendedStr(e.target.value)}
              aria-invalid={Boolean(parsedAttended.error || relationalError)}
              aria-describedby={
                parsedAttended.error
                  ? `${attendedInputId}-error`
                  : relationalError
                  ? `${attendedInputId}-relational-error`
                  : undefined
              }
              className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded focus:border-accent text-charcoal tabular-nums outline-none"
            />
            {parsedAttended.error && (
              <span
                id={`${attendedInputId}-error`}
                role="alert"
                className="text-[11px] text-[#a83232] block"
              >
                {parsedAttended.error}
              </span>
            )}
          </div>

          {/* Target Percentage */}
          <div className="space-y-1">
            <label
              htmlFor={targetInputId}
              className="block text-xs font-medium text-charcoal"
            >
              Target Percentage (%)
            </label>
            <input
              id={targetInputId}
              type="number"
              min="0"
              max="100"
              step="any"
              value={targetStr}
              onChange={(e) => setTargetStr(e.target.value)}
              aria-invalid={Boolean(parsedTarget.error)}
              aria-describedby={parsedTarget.error ? `${targetInputId}-error` : undefined}
              className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded focus:border-accent text-charcoal tabular-nums outline-none"
            />
            {parsedTarget.error ? (
              <span
                id={`${targetInputId}-error`}
                role="alert"
                className="text-[11px] text-[#a83232] block"
              >
                {parsedTarget.error}
              </span>
            ) : (
              <div className="flex gap-1 pt-1">
                {[65, 75, 80, 85].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTargetStr(String(preset))}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                      targetStr === String(preset)
                        ? 'border-accent bg-accent-light text-accent font-semibold'
                        : 'border-border text-charcoal-light hover:text-charcoal hover:bg-background-subtle'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Optional: Remaining Classes */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor={remainingInputId}
                className="block text-xs font-medium text-charcoal"
              >
                Remaining Classes
              </label>
              <span className="text-[10px] text-charcoal-light">Optional</span>
            </div>
            <input
              id={remainingInputId}
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 15"
              value={remainingStr}
              onChange={(e) => setRemainingStr(e.target.value)}
              aria-invalid={Boolean(parsedRemaining.error)}
              aria-describedby={
                parsedRemaining.error ? `${remainingInputId}-error` : undefined
              }
              className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded focus:border-accent text-charcoal tabular-nums outline-none"
            />
            {parsedRemaining.error && (
              <span
                id={`${remainingInputId}-error`}
                role="alert"
                className="text-[11px] text-[#a83232] block"
              >
                {parsedRemaining.error}
              </span>
            )}
          </div>
        </div>
      </form>

      {/* Calculated Results Area */}
      {metrics && (
        <div className="space-y-4 pt-2">
          {/* Progress Bar Component */}
          <div className="p-3 bg-background-subtle border border-border rounded space-y-2">
            <AttendanceProgress
              classesHeld={metrics.classesHeld}
              classesAttended={metrics.classesAttended}
              targetPercentage={metrics.targetPercentage}
              currentPercentage={metrics.currentPercentage}
              size="lg"
            />
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-background-subtle border border-border rounded">
              <span className="text-charcoal-light text-[11px] block">Current Attendance</span>
              <span className="text-sm font-semibold text-charcoal tabular-nums">
                {formatAttendancePercentage(metrics.currentPercentage, {
                  target: metrics.targetPercentage,
                })}
              </span>
            </div>

            <div className="p-2.5 bg-background-subtle border border-border rounded">
              <span className="text-charcoal-light text-[11px] block">Classes Missed</span>
              <span className="text-sm font-semibold text-charcoal tabular-nums">
                {metrics.classesMissed}
              </span>
            </div>

            <div className="p-2.5 bg-background-subtle border border-border rounded">
              <span className="text-charcoal-light text-[11px] block">Classes to Recover</span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  metrics.classesToRecover === null
                    ? 'text-[#a83232]'
                    : metrics.classesToRecover > 0
                    ? 'text-[#995d12]'
                    : 'text-accent'
                }`}
              >
                {metrics.classesToRecover === null
                  ? 'Unachievable'
                  : metrics.classesToRecover === 0
                  ? '0 (On track)'
                  : `${metrics.classesToRecover} consecutive`}
              </span>
            </div>

            <div className="p-2.5 bg-background-subtle border border-border rounded">
              <span className="text-charcoal-light text-[11px] block">Safe Bunks Right Now</span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  metrics.safeBunkCount > 0 ? 'text-accent' : 'text-charcoal-muted'
                }`}
              >
                {metrics.safeBunkCount === Infinity ? 'Unlimited (0% target)' : metrics.safeBunkCount}
              </span>
            </div>
          </div>

          {/* Explanation Callout */}
          <AttendanceStatus
            status={metrics.status}
            description={metrics.statusDescription}
            safeBunkCount={metrics.safeBunkCount}
            classesToRecover={metrics.classesToRecover}
            variant="callout"
          />

          {/* Next class sensitivity impact */}
          {nextImpact && (
            <div className="p-3 bg-background-subtle border border-border rounded text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium text-charcoal text-[11px]">
                <HelpCircle className="w-3.5 h-3.5 text-charcoal-muted" aria-hidden="true" />
                <span>Next Class Projection</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-background rounded border border-border">
                  <span className="text-charcoal-muted">If you attend next class:</span>
                  <span className="font-semibold text-accent tabular-nums flex items-center gap-1">
                    <ArrowRight className="w-3 h-3 text-accent" aria-hidden="true" />
                    {formatAttendancePercentage(nextImpact.ifAttendedPercentage, {
                      target: metrics.targetPercentage,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-background rounded border border-border">
                  <span className="text-charcoal-muted">If you miss next class:</span>
                  <span
                    className={`font-semibold tabular-nums flex items-center gap-1 ${
                      nextImpact.ifMissedPercentage >= metrics.targetPercentage - 1e-10
                        ? 'text-accent'
                        : 'text-[#995d12]'
                    }`}
                  >
                    <ArrowRight className="w-3 h-3 text-charcoal-light" aria-hidden="true" />
                    {formatAttendancePercentage(nextImpact.ifMissedPercentage, {
                      target: metrics.targetPercentage,
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Feasibility with remaining classes */}
          {feasibility && (
            <div
              role="status"
              className={`p-3 rounded border text-xs space-y-2 ${
                feasibility.isAchievable
                  ? 'bg-status-eligibleBg text-status-eligible border-[#cbe0d3]'
                  : 'bg-status-ineligibleBg text-status-ineligible border-[#feb2b2]'
              }`}
            >
              <span className="font-semibold block">
                Exam Feasibility ({feasibility.remainingClasses} classes remaining)
              </span>
              <p className="opacity-95">{feasibility.feasibilityDescription}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div>
                  <span className="opacity-75 block text-[11px]">Final Total Classes</span>
                  <span className="font-semibold tabular-nums">{feasibility.totalClassesWillBeHeld}</span>
                </div>
                <div>
                  <span className="opacity-75 block text-[11px]">Max Achievable %</span>
                  <span className="font-semibold tabular-nums">
                    {feasibility.maxAchievableAttendance.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="opacity-75 block text-[11px]">Bunks Before Exam</span>
                  <span className="font-semibold tabular-nums">
                    {feasibility.isAchievable
                      ? `${feasibility.maxSafeBunksBeforeExam} of ${feasibility.remainingClasses}`
                      : '0'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
