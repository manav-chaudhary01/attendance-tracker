import React, { useEffect, useRef } from 'react';
import { HeatmapDayCell } from '../../features/heatmap/heatmapData';
import { formatDateForDisplay, getRelativeDateBadge } from '../../utils/dates';
import { formatAttendancePercentage } from '../../features/attendance/calculations';
import {
  Calendar,
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileText,
} from 'lucide-react';

interface DayDetailsModalProps {
  day: HeatmapDayCell | null;
  isOpen: boolean;
  onClose: () => void;
  onEditDate?: (date: string) => void;
}

export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({
  day,
  isOpen,
  onClose,
  onEditDate,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (typeof dialog.showModal === 'function') {
        try {
          if (!dialog.open) {
            dialog.showModal();
          }
        } catch {
          // fallback
          dialog.setAttribute('open', '');
        }
      } else {
        dialog.setAttribute('open', '');
      }
    } else {
      if (typeof dialog.close === 'function') {
        try {
          if (dialog.open) {
            dialog.close();
          }
        } catch {
          dialog.removeAttribute('open');
        }
      } else {
        dialog.removeAttribute('open');
      }
    }
  }, [isOpen]);

  if (!isOpen || !day) return null;

  const relativeBadge = getRelativeDateBadge(day.date);
  const formattedDate = formatDateForDisplay(day.date, { includeWeekday: true, includeYear: true });

  const handleEditClick = () => {
    onClose();
    if (onEditDate) {
      onEditDate(day.date);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="p-0 rounded border border-border bg-background shadow-lg max-w-lg w-full backdrop:bg-charcoal/40 text-charcoal outline-none m-auto"
      aria-labelledby="day-details-title"
    >
      <div className="p-5 space-y-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-background-subtle border border-border text-forest">
              <Calendar className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="day-details-title" className="text-base font-semibold text-charcoal">
                  {formattedDate}
                </h2>
                {relativeBadge && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-forest/10 text-forest border border-forest/20">
                    {relativeBadge}
                  </span>
                )}
                {day.isToday && !relativeBadge && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-forest/10 text-forest border border-forest/20">
                    Today
                  </span>
                )}
              </div>
              <p className="text-xs text-charcoal-muted mt-0.5">
                {day.isFuture
                  ? 'Future calendar date'
                  : day.records.length === 0
                  ? 'No classes recorded for this date'
                  : `${day.records.length} subject${day.records.length > 1 ? 's' : ''} recorded`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-charcoal-muted hover:text-charcoal p-1 rounded hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-forest outline-none transition-colors"
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Day Summary Metrics */}
        {day.classesHeld > 0 && (
          <div className="grid grid-cols-4 gap-2 bg-background-subtle p-3 rounded border border-border text-center">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-charcoal-muted font-medium">Held</div>
              <div className="text-sm font-semibold text-charcoal mt-0.5">{day.classesHeld}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-charcoal-muted font-medium">Attended</div>
              <div className="text-sm font-semibold text-forest mt-0.5">{day.classesAttended}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-charcoal-muted font-medium">Missed</div>
              <div
                className={`text-sm font-semibold mt-0.5 ${
                  day.classesMissed > 0 ? 'text-amber-800' : 'text-charcoal-muted'
                }`}
              >
                {day.classesMissed}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-charcoal-muted font-medium">Rate</div>
              <div className="text-sm font-semibold text-charcoal mt-0.5">
                {day.attendancePercentage !== null
                  ? `${formatAttendancePercentage(day.attendancePercentage)}%`
                  : '—'}
              </div>
            </div>
          </div>
        )}

        {/* Status Callout */}
        {day.isFuture ? (
          <div className="flex items-center gap-2 p-3 rounded bg-stone-50 border border-stone-200 text-charcoal-muted text-xs">
            <HelpCircle className="w-4 h-4 shrink-0 text-stone-400" />
            <span>Attendance cannot be logged for future dates.</span>
          </div>
        ) : day.records.length === 0 ? (
          <div className="p-4 rounded bg-background-subtle border border-border text-center text-xs text-charcoal-muted space-y-1">
            <p className="font-medium text-charcoal">No Classes Recorded</p>
            <p>You have not logged any class sessions for this date.</p>
          </div>
        ) : day.status === 'zero_attendance' ? (
          <div className="flex items-center gap-2 p-3 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
            <span>All scheduled classes were missed on this date.</span>
          </div>
        ) : day.status === 'full_attendance' ? (
          <div className="flex items-center gap-2 p-3 rounded bg-forest/10 border border-forest/20 text-forest text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-forest" />
            <span>100% full attendance recorded for this date.</span>
          </div>
        ) : null}

        {/* Subject Breakdown List */}
        {day.records.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider">
              Recorded Classes
            </h3>
            <div className="divide-y divide-border border border-border rounded overflow-hidden">
              {day.records.map((r) => {
                const pct = r.classesHeld > 0 ? (r.classesAttended / r.classesHeld) * 100 : 0;
                return (
                  <div key={r.id} className="p-3 bg-background flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-charcoal">{r.subjectName}</span>
                        {r.subjectCode && (
                          <span className="text-[10px] font-mono px-1 py-0.2 bg-background-subtle border border-border rounded text-charcoal-muted">
                            {r.subjectCode}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold">
                        <span className="text-forest">{r.classesAttended}</span>
                        <span className="text-charcoal-muted"> / {r.classesHeld}</span>
                        <span className="text-[11px] text-charcoal-muted ml-1.5">
                          ({formatAttendancePercentage(pct)}%)
                        </span>
                      </div>
                    </div>
                    {r.notes && (
                      <div className="flex items-center gap-1.5 text-[11px] text-charcoal-muted italic mt-0.5">
                        <FileText className="w-3 h-3 text-stone-400 shrink-0" />
                        <span>{r.notes}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-charcoal-muted hover:text-charcoal border border-border rounded hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-forest outline-none transition-colors"
          >
            Close
          </button>

          {!day.isFuture && onEditDate && (
            <button
              type="button"
              onClick={handleEditClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-forest text-white rounded hover:bg-forest/90 focus-visible:ring-2 focus-visible:ring-forest outline-none transition-colors shadow-xs"
            >
              <span>Edit in Daily Logger</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
};
