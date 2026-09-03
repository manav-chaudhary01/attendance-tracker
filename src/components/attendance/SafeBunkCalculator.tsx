import React, { useState, useId } from 'react';
import {
  calculateSafeBunks,
  calculateClassesToRecover,
  calculateRemainingClassesFeasibility,
  formatAttendancePercentage,
  parseCountInput,
  parseTargetInput,
} from '../../features/attendance/calculations';
import { ShieldCheck, Info } from 'lucide-react';

interface SafeBunkCalculatorProps {
  initialHeld?: number;
  initialAttended?: number;
  initialTarget?: number;
  className?: string;
}

export const SafeBunkCalculator: React.FC<SafeBunkCalculatorProps> = ({
  initialHeld = 24,
  initialAttended = 21,
  initialTarget = 75,
  className = '',
}) => {
  const heldId = useId();
  const attendedId = useId();
  const targetId = useId();
  const remainingId = useId();

  const [heldStr, setHeldStr] = useState<string>(String(initialHeld));
  const [attendedStr, setAttendedStr] = useState<string>(String(initialAttended));
  const [targetStr, setTargetStr] = useState<string>(String(initialTarget));
  const [remainingStr, setRemainingStr] = useState<string>('');

  const parsedHeld = parseCountInput(heldStr, 'Classes held');
  const parsedAttended = parseCountInput(attendedStr, 'Classes attended');
  const parsedTarget = parseTargetInput(targetStr, 'Target');
  const parsedRemaining =
    remainingStr.trim() === '' ? { value: null } : parseCountInput(remainingStr, 'Remaining classes');

  let relationalError: string | undefined;
  if (
    parsedHeld.value !== null &&
    parsedAttended.value !== null &&
    parsedAttended.value > parsedHeld.value
  ) {
    relationalError = 'Attended classes cannot exceed held classes.';
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

  const safeBunks = isValid
    ? calculateSafeBunks(parsedHeld.value!, parsedAttended.value!, parsedTarget.value!)
    : 0;

  const recoveryNeeded = isValid
    ? calculateClassesToRecover(parsedHeld.value!, parsedAttended.value!, parsedTarget.value!)
    : 0;

  const currentPct =
    isValid && parsedHeld.value! > 0
      ? (parsedAttended.value! / parsedHeld.value!) * 100
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

  // Generate a projection table for missing 1 to safeBunks + 2 classes
  const projections: Array<{ missedCount: number; resultingHeld: number; resultingPct: number; isSafe: boolean }> = [];
  if (isValid && parsedHeld.value! > 0 && safeBunks !== Infinity && safeBunks < 50) {
    const maxBunksToProject = Math.min(6, Math.max(2, safeBunks + 2));
    for (let i = 1; i <= maxBunksToProject; i++) {
      const resultingHeld = parsedHeld.value! + i;
      const resultingPct = (parsedAttended.value! / resultingHeld) * 100;
      const isSafe = resultingPct >= parsedTarget.value! - 1e-10;
      projections.push({
        missedCount: i,
        resultingHeld,
        resultingPct,
        isSafe,
      });
    }
  }

  return (
    <div className={`bg-background border border-border rounded p-5 space-y-5 ${className}`}>
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-charcoal">Safe Bunk Analyzer</h2>
        </div>
        {isValid && (
          <span className="text-xs text-charcoal-muted tabular-nums">
            Current:{' '}
            <strong className="text-charcoal font-medium">
              {formatAttendancePercentage(currentPct, { target: parsedTarget.value! })}
            </strong>
          </span>
        )}
      </div>

      {/* Inputs */}
      <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label htmlFor={heldId} className="block text-xs font-medium text-charcoal">
            Classes Held
          </label>
          <input
            id={heldId}
            type="number"
            min="0"
            value={heldStr}
            onChange={(e) => setHeldStr(e.target.value)}
            aria-invalid={Boolean(parsedHeld.error || relationalError)}
            aria-describedby={parsedHeld.error ? `${heldId}-error` : undefined}
            className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded focus:border-accent text-charcoal tabular-nums outline-none"
          />
          {parsedHeld.error && (
            <span id={`${heldId}-error`} role="alert" className="text-[11px] text-[#a83232] block">
              {parsedHeld.error}
            </span>
          )}
          {relationalError && !parsedHeld.error && (
            <span role="alert" className="text-[11px] text-[#a83232] block">
              {relationalError}
            </span>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor={attendedId} className="block text-xs font-medium text-charcoal">
            Classes Attended
          </label>
          <input
            id={attendedId}
            type="number"
            min="0"
            value={attendedStr}
            onChange={(e) => setAttendedStr(e.target.value)}
            aria-invalid={Boolean(parsedAttended.error || relationalError)}
            aria-describedby={parsedAttended.error ? `${attendedId}-error` : undefined}
            className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded focus:border-accent text-charcoal tabular-nums outline-none"
          />
          {parsedAttended.error && (
            <span id={`${attendedId}-error`} role="alert" className="text-[11px] text-[#a83232] block">
              {parsedAttended.error}
            </span>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor={targetId} className="block text-xs font-medium text-charcoal">
            Target %
          </label>
          <input
            id={targetId}
            type="number"
            min="0"
            max="100"
            value={targetStr}
            onChange={(e) => setTargetStr(e.target.value)}
            aria-invalid={Boolean(parsedTarget.error)}
            aria-describedby={parsedTarget.error ? `${targetId}-error` : undefined}
            className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded focus:border-accent text-charcoal tabular-nums outline-none"
          />
          {parsedTarget.error && (
            <span id={`${targetId}-error`} role="alert" className="text-[11px] text-[#a83232] block">
              {parsedTarget.error}
            </span>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor={remainingId} className="block text-xs font-medium text-charcoal">
              Remaining Classes
            </label>
            <span className="text-[10px] text-charcoal-light">Optional</span>
          </div>
          <input
            id={remainingId}
            type="number"
            min="0"
            placeholder="Before exam"
            value={remainingStr}
            onChange={(e) => setRemainingStr(e.target.value)}
            aria-invalid={Boolean(parsedRemaining.error)}
            aria-describedby={parsedRemaining.error ? `${remainingId}-error` : undefined}
            className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded focus:border-accent text-charcoal tabular-nums outline-none"
          />
          {parsedRemaining.error && (
            <span id={`${remainingId}-error`} role="alert" className="text-[11px] text-[#a83232] block">
              {parsedRemaining.error}
            </span>
          )}
        </div>
      </form>

      {/* Main Safe Bunk Result */}
      {isValid && (
        <div className="space-y-4">
          <div className="p-4 rounded border bg-background-subtle border-border space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-charcoal-muted">Consecutive Safe Bunks:</span>
              <span className="text-lg font-bold text-charcoal tabular-nums">
                {safeBunks === Infinity
                  ? 'Unlimited (0% target)'
                  : `${safeBunks} class${safeBunks === 1 ? '' : 'es'}`}
              </span>
            </div>

            <p className="text-xs text-charcoal-muted leading-relaxed">
              {safeBunks > 0 && safeBunks !== Infinity
                ? `You can skip up to ${safeBunks} consecutive class${safeBunks === 1 ? '' : 'es'} right now and remain at or above ${parsedTarget.value!}%.`
                : recoveryNeeded !== null && recoveryNeeded > 0
                ? `You currently have 0 safe bunks. You are below target and must attend the next ${recoveryNeeded} class${recoveryNeeded === 1 ? '' : 'es'} to recover.`
                : `You currently have 0 safe bunks. Missing even 1 next class will drop your attendance below ${parsedTarget.value!}%.`}
            </p>

            {/* Assumption notice */}
            <div className="flex items-start gap-1.5 text-[11px] text-charcoal-light pt-1 border-t border-border/60">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Consecutive safe bunks assume you skip upcoming classes while no other classes are held.
                This is independent of the total remaining classes scheduled before the exam.
              </span>
            </div>
          </div>

          {/* Projection Table */}
          {projections.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-charcoal">Miss Impact Projection Table</h3>
              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-xs text-left">
                  <caption className="sr-only">Impact of skipping consecutive upcoming classes</caption>
                  <thead className="bg-background-muted text-charcoal-muted border-b border-border">
                    <tr>
                      <th scope="col" className="px-3 py-1.5 font-medium">Classes Skipped</th>
                      <th scope="col" className="px-3 py-1.5 font-medium">Held / Attended</th>
                      <th scope="col" className="px-3 py-1.5 font-medium">New Attendance</th>
                      <th scope="col" className="px-3 py-1.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 tabular-nums">
                    {projections.map((p) => (
                      <tr key={p.missedCount} className={p.isSafe ? 'bg-background' : 'bg-status-warningBg/30'}>
                        <td className="px-3 py-1.5 font-medium text-charcoal">
                          +{p.missedCount} class{p.missedCount === 1 ? '' : 'es'}
                        </td>
                        <td className="px-3 py-1.5 text-charcoal-muted">
                          {p.resultingHeld} held ({parsedAttended.value} attended)
                        </td>
                        <td className="px-3 py-1.5 font-semibold text-charcoal">
                          {formatAttendancePercentage(p.resultingPct, { target: parsedTarget.value! })}
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className={`inline-block px-1.5 py-0.5 text-[10px] rounded font-medium ${
                              p.isSafe
                                ? 'bg-status-eligibleBg text-status-eligible'
                                : 'bg-status-warningBg text-status-warning'
                            }`}
                          >
                            {p.isSafe ? 'Eligible' : 'Below Target'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Exam feasibility banner if remaining classes provided */}
          {feasibility && (
            <div
              className={`p-3 rounded border text-xs space-y-1 ${
                feasibility.isAchievable
                  ? 'bg-status-eligibleBg text-status-eligible border-[#cbe0d3]'
                  : 'bg-status-ineligibleBg text-status-ineligible border-[#feb2b2]'
              }`}
            >
              <span className="font-semibold block">
                Exam Preparation Safe Bunks ({feasibility.remainingClasses} classes remaining)
              </span>
              <p className="opacity-95">{feasibility.feasibilityDescription}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
