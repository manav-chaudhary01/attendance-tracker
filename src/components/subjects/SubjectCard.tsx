import React from 'react';
import { Subject } from '../../types/subject';
import { calculateSubjectMetrics } from '../../features/attendance/calculations';
import { AttendanceProgress } from '../attendance/AttendanceProgress';
import { AttendanceStatus } from '../attendance/AttendanceStatus';
import { Edit2, Trash2 } from 'lucide-react';

interface SubjectCardProps {
  subject: Subject;
  onEdit: (subject: Subject) => void;
  onDelete: (subject: Subject) => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  onEdit,
  onDelete,
}) => {
  const metrics = calculateSubjectMetrics(
    subject.totalClassesHeld,
    subject.totalClassesAttended,
    subject.attendanceTarget
  );

  return (
    <div className="interactive-card p-4 space-y-3.5 group">
      {/* Top row: Subject name, code, status & actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-semibold text-charcoal">{subject.name}</h3>
            {subject.subjectCode && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background-subtle border border-border text-charcoal-muted uppercase">
                {subject.subjectCode}
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-background-subtle border border-border text-charcoal-light tabular-nums">
              Target {subject.attendanceTarget}%
            </span>
            {subject.trackingMode === 'manual' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800">
                Manual Totals
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(subject)}
            className="p-1.5 text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border rounded-md transition-all duration-150 tactile-button"
            title="Edit subject"
            aria-label={`Edit ${subject.name}`}
          >
            <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(subject)}
            className="p-1.5 text-[#a83232] hover:bg-status-ineligibleBg border border-border rounded-md transition-all duration-150 tactile-button"
            title="Delete subject"
            aria-label={`Delete ${subject.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <AttendanceProgress
        classesHeld={metrics.classesHeld}
        classesAttended={metrics.classesAttended}
        targetPercentage={metrics.targetPercentage}
        currentPercentage={metrics.currentPercentage}
        size="md"
      />

      {/* Footer Metrics & Status Indicator */}
      <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <AttendanceStatus status={metrics.status} variant="badge" />

        <div className="text-xs text-charcoal-muted tabular-nums">
          {metrics.status === 'not_started' ? (
            <span className="text-charcoal-light">No classes held</span>
          ) : metrics.status === 'eligible' ? (
            metrics.safeBunkCount === Infinity ? (
              <span className="text-accent font-medium">Safe bunks: Unlimited</span>
            ) : metrics.safeBunkCount > 0 ? (
              <span className="text-accent font-medium">
                {metrics.safeBunkCount} safe bunk{metrics.safeBunkCount === 1 ? '' : 's'}
              </span>
            ) : (
              <span className="text-charcoal-muted">0 safe bunks</span>
            )
          ) : metrics.status === 'at_risk' ? (
            <span className="text-[#995d12] font-medium">
              Attend next {metrics.classesToRecover} class{metrics.classesToRecover === 1 ? '' : 'es'}
            </span>
          ) : (
            <span className="text-[#a83232] font-medium">Target unachievable</span>
          )}
        </div>
      </div>
    </div>
  );
};
