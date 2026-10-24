import React from 'react';
import { formatAttendancePercentage } from '../../features/attendance/calculations';

interface AttendanceProgressProps {
  classesHeld: number;
  classesAttended: number;
  targetPercentage: number;
  currentPercentage?: number | null;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AttendanceProgress: React.FC<AttendanceProgressProps> = ({
  classesHeld,
  classesAttended,
  targetPercentage,
  currentPercentage = classesHeld > 0 ? (classesAttended / classesHeld) * 100 : null,
  showLabels = true,
  size = 'md',
  className = '',
}) => {
  const isStarted = classesHeld > 0 && currentPercentage !== null;
  const isEligible = isStarted && currentPercentage >= targetPercentage - 1e-10;
  const isSeverelyLow = isStarted && !isEligible && currentPercentage < Math.max(0, targetPercentage - 15);

  // Height configurations
  const barHeight = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';

  // Fill color based on eligibility status
  let fillColor = 'bg-charcoal-light';
  if (isStarted) {
    if (isEligible) {
      fillColor = 'bg-accent'; // Muted green
    } else if (isSeverelyLow) {
      fillColor = 'bg-[#a83232]'; // Muted red
    } else {
      fillColor = 'bg-[#995d12]'; // Muted amber
    }
  }

  const fillWidthPercent = isStarted ? Math.min(100, Math.max(0, currentPercentage)) : 0;
  const targetMarkerPercent = Math.min(100, Math.max(0, targetPercentage));

  const accessibleValueText = isStarted
    ? `${formatAttendancePercentage(currentPercentage, { target: targetPercentage })} (${classesAttended} of ${classesHeld} classes, target ${targetPercentage}%)`
    : 'No classes held yet';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs text-charcoal-muted tabular-nums">
          <span>
            {classesAttended} / {classesHeld} classes
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`font-medium ${
                !isStarted
                  ? 'text-charcoal-light'
                  : isEligible
                  ? 'text-accent'
                  : isSeverelyLow
                  ? 'text-[#a83232]'
                  : 'text-[#995d12]'
              }`}
            >
              {formatAttendancePercentage(currentPercentage, { target: targetPercentage })}
            </span>
            <span className="text-[11px] text-charcoal-light">
              (target {targetPercentage}%)
            </span>
          </div>
        </div>
      )}

      {/* Progress Track */}
      <div
        role="progressbar"
        aria-valuenow={isStarted ? Math.round(currentPercentage) : 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={accessibleValueText}
        className={`relative w-full ${barHeight} bg-background-muted border border-border rounded-sm overflow-hidden`}
      >
        {/* Fill bar */}
        <div
          className={`h-full ${fillColor} transition-all duration-300 ease-out`}
          style={{ width: `${fillWidthPercent}%` }}
        />

        {/* Target Marker Line (if target is between 1% and 99%) */}
        {targetMarkerPercent > 0 && targetMarkerPercent < 100 && (
          <div
            title={`Target: ${targetPercentage}%`}
            aria-hidden="true"
            className="absolute top-0 bottom-0 w-0.5 bg-charcoal pointer-events-none opacity-60"
            style={{ left: `${targetMarkerPercent}%` }}
          />
        )}
      </div>
    </div>
  );
};
