import React, { useState, useEffect, useId } from 'react';
import { Subject } from '../../types/subject';
import { DailyAttendanceRecord } from '../../types/attendance';
import {
  getDailyAttendanceForDate,
  saveDailyAttendanceSession,
  DailyAttendanceEntry,
} from '../../features/history/attendanceService';
import { IStorage } from '../../types/storage';
import {
  getTodayLocalDateString,
  addDays,
  formatDateForDisplay,
  getRelativeDateBadge,
  isFutureDate,
  isToday,
  isValidDateString,
} from '../../utils/dates';
import {
  formatAttendancePercentage,
} from '../../features/attendance/calculations';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Minus,
  Save,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

interface DailyAttendanceFormProps {
  semesterId: string;
  semesterName: string;
  subjects: Subject[];
  storage: IStorage;
  onAttendanceSaved: () => Promise<void>;
  initialDate?: string;
  onNavigateToSubjects?: () => void;
}

interface SubjectDraftState {
  classesHeld: number;
  classesAttended: number;
  notes: string;
  isCustomCount: boolean; // true if using custom count > 1
}

export const DailyAttendanceForm: React.FC<DailyAttendanceFormProps> = ({
  semesterId,
  semesterName,
  subjects,
  storage,
  onAttendanceSaved,
  initialDate,
  onNavigateToSubjects,
}) => {
  const today = getTodayLocalDateString();
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || today);
  const [existingRecords, setExistingRecords] = useState<Map<string, DailyAttendanceRecord>>(new Map());
  const [drafts, setDrafts] = useState<Map<string, SubjectDraftState>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dateInputId = useId();
  const isFuture = isFutureDate(selectedDate, today);
  const relativeBadge = getRelativeDateBadge(selectedDate, today);

  // Synchronize when initialDate prop changes from external navigation
  useEffect(() => {
    if (initialDate && isValidDateString(initialDate)) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // Load existing records whenever selectedDate or semesterId changes
  useEffect(() => {
    let isCancelled = false;

    async function loadRecords() {
      setIsLoading(true);
      setErrorMessage(null);
      setSaveSuccessMsg(null);
      try {
        const recordsMap = await getDailyAttendanceForDate(semesterId, selectedDate, storage);
        if (isCancelled) return;
        setExistingRecords(recordsMap);

        // Initialize draft state for each subject
        const initialDrafts = new Map<string, SubjectDraftState>();
        for (const subj of subjects) {
          if (subj.trackingMode === 'manual') continue;

          const rec = recordsMap.get(subj.id);
          if (rec) {
            initialDrafts.set(subj.id, {
              classesHeld: rec.classesHeld,
              classesAttended: rec.classesAttended,
              notes: rec.notes || '',
              isCustomCount: rec.classesHeld > 1,
            });
          } else {
            // Default: No Class
            initialDrafts.set(subj.id, {
              classesHeld: 0,
              classesAttended: 0,
              notes: '',
              isCustomCount: false,
            });
          }
        }
        setDrafts(initialDrafts);
      } catch (err: unknown) {
        if (isCancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load attendance records for date.';
        setErrorMessage(msg);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadRecords();
    return () => {
      isCancelled = true;
    };
  }, [semesterId, selectedDate, subjects, storage]);

  // Quick state updaters
  const handleMarkPresent = (subjectId: string) => {
    if (isFuture) return;
    setDrafts((prev) => {
      const next = new Map(prev);
      const current = next.get(subjectId);
      next.set(subjectId, {
        classesHeld: 1,
        classesAttended: 1,
        notes: current?.notes || '',
        isCustomCount: false,
      });
      return next;
    });
    setSaveSuccessMsg(null);
  };

  const handleMarkAbsent = (subjectId: string) => {
    if (isFuture) return;
    setDrafts((prev) => {
      const next = new Map(prev);
      const current = next.get(subjectId);
      next.set(subjectId, {
        classesHeld: 1,
        classesAttended: 0,
        notes: current?.notes || '',
        isCustomCount: false,
      });
      return next;
    });
    setSaveSuccessMsg(null);
  };

  const handleMarkNoClass = (subjectId: string) => {
    if (isFuture) return;
    setDrafts((prev) => {
      const next = new Map(prev);
      const current = next.get(subjectId);
      next.set(subjectId, {
        classesHeld: 0,
        classesAttended: 0,
        notes: current?.notes || '',
        isCustomCount: false,
      });
      return next;
    });
    setSaveSuccessMsg(null);
  };

  const handleCustomHeldChange = (subjectId: string, held: number) => {
    if (isFuture) return;
    setDrafts((prev) => {
      const next = new Map(prev);
      const current = next.get(subjectId) || {
        classesHeld: 1,
        classesAttended: 1,
        notes: '',
        isCustomCount: true,
      };
      const validHeld = Math.max(0, held);
      const validAttended = Math.min(validHeld, current.classesAttended);
      next.set(subjectId, {
        ...current,
        classesHeld: validHeld,
        classesAttended: validAttended,
        isCustomCount: true,
      });
      return next;
    });
    setSaveSuccessMsg(null);
  };

  const handleCustomAttendedChange = (subjectId: string, attended: number) => {
    if (isFuture) return;
    setDrafts((prev) => {
      const next = new Map(prev);
      const current = next.get(subjectId) || {
        classesHeld: 1,
        classesAttended: 1,
        notes: '',
        isCustomCount: true,
      };
      const validAttended = Math.max(0, Math.min(current.classesHeld, attended));
      next.set(subjectId, {
        ...current,
        classesAttended: validAttended,
        isCustomCount: true,
      });
      return next;
    });
    setSaveSuccessMsg(null);
  };

  const handleToggleCustom = (subjectId: string) => {
    if (isFuture) return;
    setDrafts((prev) => {
      const next = new Map(prev);
      const current = next.get(subjectId);
      const isCustom = !current?.isCustomCount;
      next.set(subjectId, {
        classesHeld: isCustom ? Math.max(2, current?.classesHeld || 2) : current?.classesHeld || 1,
        classesAttended: isCustom ? Math.max(1, current?.classesAttended || 1) : current?.classesAttended || 1,
        notes: current?.notes || '',
        isCustomCount: isCustom,
      });
      return next;
    });
  };

  // Date Navigation
  const handlePreviousDay = () => {
    setSelectedDate((curr) => addDays(curr, -1));
  };

  const handleNextDay = () => {
    setSelectedDate((curr) => addDays(curr, 1));
  };

  const handleJumpToToday = () => {
    setSelectedDate(today);
  };

  // Reset to saved state
  const handleResetDrafts = () => {
    const reset = new Map<string, SubjectDraftState>();
    for (const subj of subjects) {
      if (subj.trackingMode === 'manual') continue;
      const rec = existingRecords.get(subj.id);
      if (rec) {
        reset.set(subj.id, {
          classesHeld: rec.classesHeld,
          classesAttended: rec.classesAttended,
          notes: rec.notes || '',
          isCustomCount: rec.classesHeld > 1,
        });
      } else {
        reset.set(subj.id, {
          classesHeld: 0,
          classesAttended: 0,
          notes: '',
          isCustomCount: false,
        });
      }
    }
    setDrafts(reset);
    setSaveSuccessMsg(null);
  };

  // Save session
  const handleSave = async () => {
    if (isFuture) {
      setErrorMessage(`Cannot save attendance for future date (${selectedDate}).`);
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const entries: DailyAttendanceEntry[] = [];
      for (const [subjectId, draft] of drafts.entries()) {
        entries.push({
          subjectId,
          classesHeld: draft.classesHeld,
          classesAttended: draft.classesAttended,
          notes: draft.notes,
        });
      }

      const result = await saveDailyAttendanceSession(
        semesterId,
        selectedDate,
        entries,
        storage
      );

      // Trigger parent callback to refresh global state/metrics
      await onAttendanceSaved();

      // Refresh local existing records map
      const updatedMap = await getDailyAttendanceForDate(semesterId, selectedDate, storage);
      setExistingRecords(updatedMap);

      setSaveSuccessMsg(
        `Saved attendance for ${formatDateForDisplay(selectedDate)} (${result.savedCount} active record${
          result.savedCount === 1 ? '' : 's'
        }).`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save attendance.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Check if drafts differ from saved existingRecords
  let hasUnsavedChanges = false;
  for (const [subjId, draft] of drafts.entries()) {
    const saved = existingRecords.get(subjId);
    if (!saved) {
      if (draft.classesHeld > 0) {
        hasUnsavedChanges = true;
        break;
      }
    } else {
      if (
        saved.classesHeld !== draft.classesHeld ||
        saved.classesAttended !== draft.classesAttended ||
        (saved.notes || '') !== (draft.notes || '')
      ) {
        hasUnsavedChanges = true;
        break;
      }
    }
  }

  const dailySubjects = subjects.filter((s) => s.trackingMode === 'daily');
  const manualSubjects = subjects.filter((s) => s.trackingMode === 'manual');

  return (
    <div className="space-y-6">
      {/* Date Navigation Bar */}
      <div className="tactile-card p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left: Previous, Next, Quick Today */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePreviousDay}
              className="p-1.5 text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border rounded-md transition-all duration-150 tactile-button"
              title="Previous Day"
              aria-label="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleNextDay}
              className="p-1.5 text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border rounded-md transition-all duration-150 tactile-button"
              title="Next Day"
              aria-label="Next Day"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>

            {!isToday(selectedDate, today) && (
              <button
                type="button"
                onClick={handleJumpToToday}
                className="px-2.5 py-1 text-xs font-medium text-accent bg-accent-light border border-accent-subtle rounded-md hover:bg-accent hover:text-white transition-all duration-150 tactile-button"
              >
                Jump to Today
              </button>
            )}
          </div>

          {/* Center / Right: Date display & Native Picker */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-charcoal">
                {formatDateForDisplay(selectedDate, { includeWeekday: true, includeYear: true })}
              </span>
              {relativeBadge && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-light text-accent border border-accent-subtle">
                  {relativeBadge}
                </span>
              )}
            </div>

            <div className="relative">
              <label htmlFor={dateInputId} className="sr-only">
                Select Calendar Date
              </label>
              <input
                id={dateInputId}
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
                className="w-8 h-8 opacity-0 absolute inset-0 cursor-pointer"
                title="Open calendar picker"
              />
              <button
                type="button"
                className="p-1.5 rounded-md border border-border text-charcoal-muted hover:text-charcoal hover:bg-background-subtle pointer-events-none transition-colors"
                aria-hidden="true"
                tabIndex={-1}
              >
                <Calendar className="w-4 h-4 text-accent" />
              </button>
            </div>
          </div>
        </div>

        {/* Future date warning */}
        {isFuture && (
          <div
            role="alert"
            className="p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 animate-reveal-down"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              You are viewing a future date ({selectedDate}). Attendance logging is locked for future dates. Please return to today or select a past date to record attendance.
            </span>
          </div>
        )}

        {/* Success Announcement */}
        {saveSuccessMsg && (
          <div
            role="status"
            className="p-2.5 rounded-md bg-status-eligibleBg border border-[#cbe0d3] text-status-eligible text-xs flex items-center justify-between animate-reveal-down"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" aria-hidden="true" />
              <span className="font-medium">{saveSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessMsg(null)}
              className="text-status-eligible opacity-75 hover:opacity-100 p-1"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Error Announcement */}
        {errorMessage && (
          <div
            role="alert"
            className="p-2.5 rounded-md bg-status-ineligibleBg border border-[#feb2b2] text-status-ineligible text-xs flex items-center justify-between animate-reveal-down"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-status-ineligible opacity-75 hover:opacity-100 p-1"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Main Subjects Attendance List */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-charcoal-muted animate-pulse">
          Loading daily attendance records...
        </div>
      ) : dailySubjects.length === 0 && manualSubjects.length === 0 ? (
        <div className="p-8 text-center text-xs text-charcoal-muted bg-background-subtle border border-border rounded">
          No subjects exist in {semesterName}. Please add subjects to start logging daily attendance.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Action / Save Bar */}
          <div className="flex items-center justify-between py-2 border-b border-border text-xs">
            <span className="text-charcoal-muted">
              {hasUnsavedChanges ? (
                <span className="text-[#995d12] font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#995d12] inline-block animate-pulse" />
                  Unsaved changes on this date
                </span>
              ) : (
                <span className="text-charcoal-light">Records in sync</span>
              )}
            </span>

            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <button
                  type="button"
                  onClick={handleResetDrafts}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-charcoal-muted hover:text-charcoal border border-border rounded hover:bg-background-subtle transition-colors"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isFuture}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-all duration-200 shadow-2xs disabled:opacity-50 tactile-button"
              >
                <Save className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isSaving ? 'Saving...' : 'Save Attendance'}</span>
              </button>
            </div>
          </div>

          {/* Daily Tracked Subjects */}
          <div className="space-y-3">
            {dailySubjects.map((subject) => {
              const draft = drafts.get(subject.id) || {
                classesHeld: 0,
                classesAttended: 0,
                notes: '',
                isCustomCount: false,
              };

              // Compute projected attendance if this entry is saved
              const savedRec = existingRecords.get(subject.id);
              const savedHeldForDate = savedRec ? savedRec.classesHeld : 0;
              const savedAttendedForDate = savedRec ? savedRec.classesAttended : 0;

              const projectedHeld = subject.totalClassesHeld - savedHeldForDate + draft.classesHeld;
              const projectedAttended = subject.totalClassesAttended - savedAttendedForDate + draft.classesAttended;
              const projectedPct =
                projectedHeld > 0 ? (projectedAttended / projectedHeld) * 100 : null;

              const isNoClass = draft.classesHeld === 0;
              const isPresentSingle = draft.classesHeld === 1 && draft.classesAttended === 1;
              const isAbsentSingle = draft.classesHeld === 1 && draft.classesAttended === 0;

              return (
                <div
                  key={subject.id}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    isNoClass
                      ? 'border-border bg-white hover:border-border-strong'
                      : isPresentSingle
                      ? 'border-accent-subtle bg-accent-light/10 shadow-2xs'
                      : isAbsentSingle
                      ? 'border-amber-200 bg-amber-50/30 shadow-2xs'
                      : 'border-border-strong bg-background-subtle'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Subject Info & Projection */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-charcoal">{subject.name}</span>
                        {subject.subjectCode && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background-subtle border border-border text-charcoal-muted uppercase">
                            {subject.subjectCode}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-background-subtle border border-border text-charcoal-light tabular-nums">
                          Target {subject.attendanceTarget}%
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-muted tabular-nums">
                        <span>
                          Current:{' '}
                          <strong className="text-charcoal font-medium">
                            {subject.totalClassesHeld > 0
                              ? formatAttendancePercentage((subject.totalClassesAttended / subject.totalClassesHeld) * 100, {
                                  target: subject.attendanceTarget,
                                })
                              : 'No classes'}
                          </strong>{' '}
                          ({subject.totalClassesAttended}/{subject.totalClassesHeld})
                        </span>

                        {/* Projection arrow if classes held > 0 */}
                        {draft.classesHeld > 0 && projectedPct !== null && (
                          <span className="flex items-center gap-1 text-charcoal font-medium">
                            <ArrowRight className="w-3 h-3 text-charcoal-light" aria-hidden="true" />
                            <span>
                              After today:{' '}
                              <strong
                                className={
                                  projectedPct >= subject.attendanceTarget
                                    ? 'text-accent'
                                    : 'text-[#995d12]'
                                }
                              >
                                {formatAttendancePercentage(projectedPct, { target: subject.attendanceTarget })}
                              </strong>{' '}
                              ({projectedAttended}/{projectedHeld})
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Quick Action Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      {!draft.isCustomCount ? (
                        <>
                          {/* No Class */}
                          <button
                            type="button"
                            disabled={isFuture}
                            onClick={() => handleMarkNoClass(subject.id)}
                            aria-pressed={isNoClass}
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 tactile-button ${
                              isNoClass
                                ? 'bg-charcoal text-white font-semibold shadow-xs'
                                : 'text-charcoal-muted hover:text-charcoal bg-background border border-border hover:bg-background-subtle'
                            } disabled:opacity-50`}
                          >
                            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>No Class</span>
                          </button>

                          {/* Present (1/1) */}
                          <button
                            type="button"
                            disabled={isFuture}
                            onClick={() => handleMarkPresent(subject.id)}
                            aria-pressed={isPresentSingle}
                            className={`flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150 tactile-button ${
                              isPresentSingle
                                ? 'bg-accent text-white font-semibold shadow-xs'
                                : 'text-accent bg-accent-light border border-accent-subtle hover:bg-accent hover:text-white'
                            } disabled:opacity-50`}
                          >
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Present</span>
                          </button>

                          {/* Absent (0/1) */}
                          <button
                            type="button"
                            disabled={isFuture}
                            onClick={() => handleMarkAbsent(subject.id)}
                            aria-pressed={isAbsentSingle}
                            className={`flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150 tactile-button ${
                              isAbsentSingle
                                ? 'bg-status-ineligible text-white font-semibold shadow-xs'
                                : 'text-[#a83232] bg-status-ineligibleBg border border-[#feb2b2] hover:bg-status-ineligible hover:text-white'
                            } disabled:opacity-50`}
                          >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Absent</span>
                          </button>

                          {/* Multiple Classes Toggle */}
                          <button
                            type="button"
                            disabled={isFuture}
                            onClick={() => handleToggleCustom(subject.id)}
                            className="text-[11px] text-charcoal-light hover:text-charcoal px-2.5 py-1 rounded-md border border-dashed border-border transition-colors hover:border-charcoal-muted"
                            title="Multiple classes on this date"
                          >
                            Multiple classes?
                          </button>
                        </>
                      ) : (
                        /* Multiple Classes Stepper Controls */
                        <div className="flex flex-wrap items-center gap-3 p-2 bg-background border border-border rounded text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-charcoal-muted">Held:</span>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              disabled={isFuture}
                              value={draft.classesHeld}
                              onChange={(e) =>
                                handleCustomHeldChange(subject.id, parseInt(e.target.value, 10) || 0)
                              }
                              className="w-12 px-1.5 py-0.5 border border-border rounded text-center font-medium tabular-nums"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-charcoal-muted">Attended:</span>
                            <input
                              type="number"
                              min="0"
                              max={draft.classesHeld}
                              disabled={isFuture}
                              value={draft.classesAttended}
                              onChange={(e) =>
                                handleCustomAttendedChange(subject.id, parseInt(e.target.value, 10) || 0)
                              }
                              className="w-12 px-1.5 py-0.5 border border-border rounded text-center font-medium tabular-nums"
                            />
                          </div>

                          {/* Quick shortcuts for multiple classes */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCustomAttendedChange(subject.id, draft.classesHeld)}
                              className="px-2 py-0.5 text-[11px] rounded bg-accent-light text-accent border border-accent-subtle hover:bg-accent hover:text-white"
                            >
                              All Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCustomAttendedChange(subject.id, 0)}
                              className="px-2 py-0.5 text-[11px] rounded bg-status-ineligibleBg text-[#a83232] border border-[#feb2b2] hover:bg-status-ineligible hover:text-white"
                            >
                              All Absent
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleCustom(subject.id)}
                              className="text-[11px] text-charcoal-light hover:text-charcoal ml-1 underline"
                            >
                              Simple mode
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Manual Totals Subjects (Separately Indicated) */}
          {manualSubjects.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                <HelpCircle className="w-4 h-4 text-charcoal-light" aria-hidden="true" />
                <span className="font-semibold text-charcoal">
                  Manual Totals Subjects ({manualSubjects.length})
                </span>
                <span>— Tracked directly via aggregate counts, excluded from daily logs.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {manualSubjects.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 bg-background-subtle border border-border rounded flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-medium text-charcoal">{sub.name}</span>
                      <span className="text-charcoal-muted block text-[11px] tabular-nums">
                        {sub.totalClassesAttended} / {sub.totalClassesHeld} classes (
                        {formatAttendancePercentage(
                          sub.totalClassesHeld > 0 ? (sub.totalClassesAttended / sub.totalClassesHeld) * 100 : null,
                          { target: sub.attendanceTarget }
                        )}
                        )
                      </span>
                    </div>
                    {onNavigateToSubjects && (
                      <button
                        type="button"
                        onClick={onNavigateToSubjects}
                        className="text-[11px] text-accent hover:underline font-medium"
                      >
                        Edit in Subjects
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
