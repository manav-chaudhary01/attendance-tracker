import React, { useState, useEffect, useMemo } from 'react';
import { AppRoute } from '../../app/router';
import { Semester } from '../../types/semester';
import { Subject } from '../../types/subject';
import { IStorage } from '../../types/storage';
import {
  getAttendanceHistory,
  AttendanceHistoryItem,
} from '../../features/history/attendanceService';
import { AttendanceCalculator } from '../attendance/AttendanceCalculator';
import { SafeBunkCalculator } from '../attendance/SafeBunkCalculator';
import { AttendanceProgress } from '../attendance/AttendanceProgress';
import { AttendanceStatus } from '../attendance/AttendanceStatus';
import {
  calculateSemesterOverall,
  calculateSubjectMetrics,
  formatAttendancePercentage,
} from '../../features/attendance/calculations';
import {
  getRelativeDateBadge,
  getTodayLocalDateString,
} from '../../utils/dates';
import {
  Calculator,
  ShieldCheck,
  Plus,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Clock,
  Sparkles,
  Layers,
  FileText,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (route: AppRoute) => void;
  activeSemester: Semester | null;
  subjects: Subject[];
  storage?: IStorage;
  onAddSubjectClick?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  activeSemester,
  subjects,
  storage,
}) => {
  const [calculatorTab, setCalculatorTab] = useState<'recovery' | 'safebunk'>('recovery');
  const [recentRecords, setRecentRecords] = useState<AttendanceHistoryItem[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState<boolean>(false);

  const todayStr = getTodayLocalDateString();

  // Load recent activity for the active semester
  useEffect(() => {
    let isCancelled = false;

    async function loadRecentActivity() {
      if (!storage || !activeSemester) {
        setRecentRecords([]);
        return;
      }

      setIsLoadingRecent(true);
      try {
        const history = await getAttendanceHistory(
          { semesterId: activeSemester.id },
          storage
        );
        if (!isCancelled) {
          setRecentRecords(history.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to load recent activity:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingRecent(false);
        }
      }
    }

    loadRecentActivity();
    return () => {
      isCancelled = true;
    };
  }, [storage, activeSemester]);

  // Overall attendance calculation
  const overall = useMemo(() => calculateSemesterOverall(subjects), [subjects]);

  // Subject status and tiers breakdown
  const categorizedSubjects = useMemo(() => {
    const belowTarget: Array<{ subject: Subject; metrics: ReturnType<typeof calculateSubjectMetrics> }> = [];
    const closeToTarget: Array<{ subject: Subject; metrics: ReturnType<typeof calculateSubjectMetrics> }> = [];
    const comfortablyAbove: Array<{ subject: Subject; metrics: ReturnType<typeof calculateSubjectMetrics> }> = [];
    const notStarted: Array<{ subject: Subject; metrics: ReturnType<typeof calculateSubjectMetrics> }> = [];

    for (const sub of subjects) {
      const metrics = calculateSubjectMetrics(
        sub.totalClassesHeld,
        sub.totalClassesAttended,
        sub.attendanceTarget
      );

      if (metrics.status === 'not_started') {
        notStarted.push({ subject: sub, metrics });
      } else if (metrics.status === 'at_risk' || metrics.status === 'ineligible') {
        belowTarget.push({ subject: sub, metrics });
      } else if (
        metrics.currentPercentage !== null &&
        metrics.currentPercentage < sub.attendanceTarget + 5
      ) {
        closeToTarget.push({ subject: sub, metrics });
      } else {
        comfortablyAbove.push({ subject: sub, metrics });
      }
    }

    return {
      belowTarget,
      closeToTarget,
      comfortablyAbove,
      notStarted,
    };
  }, [subjects]);

  // Calculate weighted average target across active subjects
  const averageTarget = useMemo(() => {
    if (subjects.length === 0) return 75;
    return Math.round(
      subjects.reduce((sum, s) => sum + s.attendanceTarget, 0) / subjects.length
    );
  }, [subjects]);

  const totalClassesHeldInSemester = overall.totalClassesHeld;
  const totalEligibleCount =
    categorizedSubjects.closeToTarget.length + categorizedSubjects.comfortablyAbove.length;

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-charcoal tracking-tight">Student Dashboard</h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Real-time semester attendance metrics, target eligibility, and safe bunks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeSemester ? (
            <>
              {/* Primary Action: Log Today's Attendance */}
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent outline-none shadow-2xs transition-all duration-200 tactile-button"
              >
                <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Log Today&apos;s Attendance</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('subjects')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-background border border-border text-charcoal rounded-md hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-accent outline-none transition-all duration-200 tactile-button"
              >
                <Plus className="w-3.5 h-3.5 text-stone-500" aria-hidden="true" />
                <span>Add Subject</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('semesters')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent outline-none shadow-2xs transition-all duration-200 tactile-button"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Select Active Semester</span>
            </button>
          )}
        </div>
      </div>

      {/* When no semester is active */}
      {!activeSemester ? (
        <div className="space-y-6">
          <div className="tactile-card p-6 sm:p-8 max-w-2xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-light text-accent shadow-2xs">
              <Layers className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-charcoal">No Active Semester Selected</h2>
              <p className="text-xs text-charcoal-muted max-w-md mx-auto mt-1 leading-relaxed">
                Create or select an active academic semester to begin tracking attendance, calculating eligibility, and projecting safe bunks.
              </p>
            </div>

            {/* Quick 3-step feature roadmap preview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 pb-2 text-left">
              <div className="p-3 rounded-md bg-background-subtle border border-border space-y-1">
                <span className="text-[10px] font-mono font-semibold text-accent uppercase tracking-wider">Step 1</span>
                <div className="text-xs font-semibold text-charcoal">Create Semester</div>
                <p className="text-[11px] text-charcoal-muted leading-snug">Set up your academic term with optional dates.</p>
              </div>
              <div className="p-3 rounded-md bg-background-subtle border border-border space-y-1">
                <span className="text-[10px] font-mono font-semibold text-accent uppercase tracking-wider">Step 2</span>
                <div className="text-xs font-semibold text-charcoal">Add Subjects</div>
                <p className="text-[11px] text-charcoal-muted leading-snug">Configure course codes, daily mode, and targets.</p>
              </div>
              <div className="p-3 rounded-md bg-background-subtle border border-border space-y-1">
                <span className="text-[10px] font-mono font-semibold text-accent uppercase tracking-wider">Step 3</span>
                <div className="text-xs font-semibold text-charcoal">Track &amp; Analyze</div>
                <p className="text-[11px] text-charcoal-muted leading-snug">Log daily classes, calculate safe bunks, and view streaks.</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('semesters')}
                className="px-4 py-2 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-all duration-200 tactile-button shadow-2xs inline-flex items-center gap-1.5"
              >
                <span>Configure Semesters</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : subjects.length === 0 ? (
        /* When semester has no subjects */
        <div className="space-y-6">
          <div className="tactile-card p-6 sm:p-8 max-w-2xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-light text-accent shadow-2xs">
              <BookOpen className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-light text-accent border border-accent-subtle mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-subtle-pulse" aria-hidden="true" />
                <span>Active: {activeSemester.name}</span>
              </div>
              <h2 className="text-base font-semibold text-charcoal">
                No subjects added to &quot;{activeSemester.name}&quot;
              </h2>
              <p className="text-xs text-charcoal-muted max-w-md mx-auto mt-1 leading-relaxed">
                Add your course subjects to start logging class sessions and calculating recovery requirements.
              </p>
            </div>

            {/* Preview of what a tracked subject will look like */}
            <div className="p-3.5 rounded-md bg-background-subtle border border-border text-left max-w-sm mx-auto space-y-2 opacity-85">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-charcoal">Sample Course • CS101</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-light text-accent font-medium">Eligible</span>
              </div>
              <div className="w-full bg-background-muted h-1.5 rounded overflow-hidden">
                <div className="bg-accent h-full w-[80%]" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-charcoal-muted tabular-nums">
                <span>16 / 20 classes</span>
                <span className="text-accent font-medium">80.0% (target 75%)</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('subjects')}
                className="px-4 py-2 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-all duration-200 tactile-button shadow-2xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Add First Subject</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('semesters')}
                className="px-4 py-2 text-xs font-medium bg-background border border-border text-charcoal-muted hover:text-charcoal rounded-md hover:bg-background-subtle transition-all duration-200 tactile-button"
              >
                <span>Switch Semester</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Semester Summary Banner & Overall Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Overall Attendance Card */}
            <div className="interactive-card p-5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-charcoal uppercase tracking-wider">
                    Overall Attendance
                  </span>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-accent-light text-accent border border-accent-subtle">
                    {activeSemester.name}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-2.5">
                  <div className="text-3xl font-bold font-mono text-charcoal tracking-tight tabular-nums">
                    {overall.overallPercentage !== null
                      ? formatAttendancePercentage(overall.overallPercentage)
                      : '—'}
                  </div>
                  <div className="text-xs text-charcoal-muted tabular-nums">
                    <strong className="text-accent font-semibold">{overall.totalClassesAttended}</strong> / {overall.totalClassesHeld} classes
                  </div>
                </div>

                <div className="mt-3">
                  <AttendanceProgress
                    classesHeld={overall.totalClassesHeld}
                    classesAttended={overall.totalClassesAttended}
                    targetPercentage={averageTarget}
                    currentPercentage={overall.overallPercentage}
                    showLabels={false}
                    size="md"
                  />
                </div>
              </div>

              <div className="pt-2.5 border-t border-border flex items-center justify-between text-[11px] text-charcoal-muted">
                <span>Weighted across {subjects.length} subject{subjects.length > 1 ? 's' : ''}</span>
                <span className="font-medium text-charcoal">Avg Target: {averageTarget}%</span>
              </div>
            </div>

            {/* Target Status Breakdown Card */}
            <div className="interactive-card p-5 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-semibold text-charcoal uppercase tracking-wider">
                  Target Compliance
                </span>

                <div className="grid grid-cols-2 gap-2.5 mt-3">
                  {/* Meeting Target */}
                  <div className="p-3 rounded-md bg-accent-light/50 border border-accent-subtle/80 hover:bg-accent-light transition-colors duration-200">
                    <div className="flex items-center gap-1.5 text-xs text-accent font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>On Track</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-accent mt-1 tabular-nums">
                      {totalEligibleCount}
                    </div>
                    <div className="text-[10px] text-charcoal-muted mt-0.5">
                      of {subjects.length} subject{subjects.length > 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Below Target */}
                  <div className="p-3 rounded-md bg-amber-50/70 border border-amber-200/90 hover:bg-amber-50 transition-colors duration-200">
                    <div className="flex items-center gap-1.5 text-xs text-amber-900 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      <span>Below Target</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-amber-900 mt-1 tabular-nums">
                      {categorizedSubjects.belowTarget.length}
                    </div>
                    <div className="text-[10px] text-charcoal-muted mt-0.5">
                      need recovery
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-border text-[11px] text-charcoal-muted">
                {categorizedSubjects.belowTarget.length === 0 ? (
                  <span className="text-accent font-medium">Excellent: All active subjects meet your attendance targets!</span>
                ) : (
                  <span>Review recovery calculations below to plan upcoming attendance.</span>
                )}
              </div>
            </div>

            {/* Quick Action & Today Shortcut Card */}
            <div className="interactive-card p-5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-charcoal uppercase tracking-wider">
                    Today&apos;s Entry
                  </span>
                  <span className="text-[11px] font-mono text-charcoal-muted bg-background-subtle px-2 py-0.5 rounded border border-border/60">
                    {todayStr}
                  </span>
                </div>

                <div className="mt-2.5 space-y-1.5">
                  <p className="text-xs text-charcoal leading-relaxed">
                    Keep your streak active by recording today&apos;s lectures and labs.
                  </p>
                  <p className="text-[11px] text-charcoal-muted">
                    Takes only seconds to mark Present, Absent, or No Class.
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-border">
                <button
                  type="button"
                  onClick={() => onNavigate('history')}
                  className="group w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal text-white rounded-md hover:bg-charcoal/90 focus-visible:ring-2 focus-visible:ring-accent outline-none transition-all duration-200 tactile-button shadow-2xs"
                >
                  <span>Open Daily Logger</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                </button>
              </div>
            </div>
          </div>

          {/* Actionable Subject Status Tiers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-sm font-semibold text-charcoal">
                Subject Attendance &amp; Action Plan
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('subjects')}
                className="text-xs text-forest hover:text-forest/80 underline underline-offset-2 flex items-center gap-1"
              >
                <span>Manage Subjects</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Tier 1: Below Target (Needs Attention) */}
            {categorizedSubjects.belowTarget.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Below Target ({categorizedSubjects.belowTarget.length}) — Recovery Action Needed</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categorizedSubjects.belowTarget.map(({ subject, metrics }) => (
                    <div
                      key={subject.id}
                      className="interactive-card p-4 border-amber-300 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-charcoal text-xs">{subject.name}</div>
                          {subject.subjectCode && (
                            <div className="text-[10px] font-mono text-charcoal-muted">
                              {subject.subjectCode}
                            </div>
                          )}
                        </div>
                        <AttendanceStatus
                          status={metrics.status}
                          description={metrics.statusDescription}
                          classesToRecover={metrics.classesToRecover}
                          variant="badge"
                        />
                      </div>

                      <div className="flex items-baseline justify-between text-xs tabular-nums">
                        <span className="font-bold text-amber-900 font-mono">
                          {metrics.currentPercentage !== null
                            ? formatAttendancePercentage(metrics.currentPercentage)
                            : '0%'}
                        </span>
                        <span className="text-[11px] text-charcoal-muted font-mono">
                          {subject.totalClassesAttended} / {subject.totalClassesHeld} held (Target: {subject.attendanceTarget}%)
                        </span>
                      </div>

                      <AttendanceProgress
                        classesHeld={subject.totalClassesHeld}
                        classesAttended={subject.totalClassesAttended}
                        targetPercentage={subject.attendanceTarget}
                        currentPercentage={metrics.currentPercentage}
                        showLabels={false}
                        size="sm"
                      />

                      <div className="p-2 rounded bg-amber-50 text-[11px] text-amber-900 font-medium">
                        {metrics.status === 'ineligible' ? (
                          <span>Target of {subject.attendanceTarget}% cannot mathematically be recovered.</span>
                        ) : metrics.classesToRecover !== null ? (
                          <span>Must attend next <strong>{metrics.classesToRecover}</strong> class{metrics.classesToRecover > 1 ? 'es' : ''} consecutively to reach {subject.attendanceTarget}%.</span>
                        ) : (
                          <span>{metrics.statusDescription}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tier 2: Borderline / Close to Target */}
            {categorizedSubjects.closeToTarget.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
                  <Sparkles className="w-3.5 h-3.5 text-stone-500" />
                  <span>Borderline ({categorizedSubjects.closeToTarget.length}) — Thin Safe Margin</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categorizedSubjects.closeToTarget.map(({ subject, metrics }) => (
                    <div
                      key={subject.id}
                      className="interactive-card p-4 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-charcoal text-xs">{subject.name}</div>
                          {subject.subjectCode && (
                            <div className="text-[10px] font-mono text-charcoal-muted">
                              {subject.subjectCode}
                            </div>
                          )}
                        </div>
                        <AttendanceStatus
                          status={metrics.status}
                          description={metrics.statusDescription}
                          classesToRecover={metrics.classesToRecover}
                          variant="badge"
                        />
                      </div>

                      <div className="flex items-baseline justify-between text-xs tabular-nums">
                        <span className="font-bold text-accent font-mono">
                          {metrics.currentPercentage !== null
                            ? formatAttendancePercentage(metrics.currentPercentage)
                            : '—'}
                        </span>
                        <span className="text-[11px] text-charcoal-muted font-mono">
                          {subject.totalClassesAttended} / {subject.totalClassesHeld} held (Target: {subject.attendanceTarget}%)
                        </span>
                      </div>

                      <AttendanceProgress
                        classesHeld={subject.totalClassesHeld}
                        classesAttended={subject.totalClassesAttended}
                        targetPercentage={subject.attendanceTarget}
                        currentPercentage={metrics.currentPercentage}
                        showLabels={false}
                        size="sm"
                      />

                      <div className="p-2 rounded bg-background-subtle text-[11px] text-charcoal-muted">
                        <span>Safe bunks available: <strong className="text-charcoal font-semibold">{metrics.safeBunkCount}</strong> class{metrics.safeBunkCount !== 1 ? 'es' : ''}.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tier 3: Comfortably Above Target */}
            {categorizedSubjects.comfortablyAbove.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Comfortably On Track ({categorizedSubjects.comfortablyAbove.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categorizedSubjects.comfortablyAbove.map(({ subject, metrics }) => (
                    <div
                      key={subject.id}
                      className="interactive-card p-4 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-charcoal text-xs">{subject.name}</div>
                          {subject.subjectCode && (
                            <div className="text-[10px] font-mono text-charcoal-muted">
                              {subject.subjectCode}
                            </div>
                          )}
                        </div>
                        <AttendanceStatus
                          status={metrics.status}
                          description={metrics.statusDescription}
                          classesToRecover={metrics.classesToRecover}
                          variant="badge"
                        />
                      </div>

                      <div className="flex items-baseline justify-between text-xs tabular-nums">
                        <span className="font-bold text-accent font-mono">
                          {metrics.currentPercentage !== null
                            ? formatAttendancePercentage(metrics.currentPercentage)
                            : '—'}
                        </span>
                        <span className="text-[11px] text-charcoal-muted font-mono">
                          {subject.totalClassesAttended} / {subject.totalClassesHeld} held (Target: {subject.attendanceTarget}%)
                        </span>
                      </div>

                      <AttendanceProgress
                        classesHeld={subject.totalClassesHeld}
                        classesAttended={subject.totalClassesAttended}
                        targetPercentage={subject.attendanceTarget}
                        currentPercentage={metrics.currentPercentage}
                        showLabels={false}
                        size="sm"
                      />

                      <div className="p-2 rounded bg-accent-light/50 border border-accent-subtle/80 text-[11px] text-accent">
                        <span>Safe bunks available: <strong className="font-semibold">{metrics.safeBunkCount}</strong> class{metrics.safeBunkCount !== 1 ? 'es' : ''}.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Attendance Activity Feed */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent" />
                <h2 className="text-sm font-semibold text-charcoal">Recent Attendance Activity</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="text-xs text-accent hover:text-accent-hover font-medium underline underline-offset-2 flex items-center gap-1 transition-colors"
              >
                <span>View Full History</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {isLoadingRecent ? (
              <div className="p-6 text-center text-xs text-charcoal-muted animate-pulse bg-background border border-border rounded-md">
                Loading recent activity...
              </div>
            ) : recentRecords.length === 0 ? (
              <div className="p-6 rounded-md bg-background border border-border text-center text-xs text-charcoal-muted space-y-1">
                <p className="font-medium text-charcoal">No Attendance Logged Yet</p>
                <p>Click &quot;Log Today&apos;s Attendance&quot; above to record your first class session.</p>
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-lg bg-white shadow-2xs overflow-hidden">
                {recentRecords.map((item) => {
                  const relativeBadge = getRelativeDateBadge(item.date);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-background-subtle/60 transition-colors duration-150 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="font-mono font-medium text-charcoal min-w-[5.5rem] tabular-nums">
                          {item.date}
                          {relativeBadge && (
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-accent-light text-accent border border-accent-subtle font-sans font-medium">
                              {relativeBadge}
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="font-semibold text-charcoal">{item.subjectName}</span>
                          {item.subjectCode && (
                            <span className="text-[10px] font-mono text-charcoal-muted ml-1.5">
                              ({item.subjectCode})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        {item.notes && (
                          <span
                            title={item.notes}
                            className="text-[11px] text-charcoal-muted italic truncate max-w-xs flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3 text-stone-400 shrink-0" />
                            <span>{item.notes}</span>
                          </span>
                        )}

                        <span className="font-mono font-semibold tabular-nums">
                          <span className="text-accent">{item.classesAttended}</span>
                          <span className="text-charcoal-muted"> / {item.classesHeld}</span>
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border tabular-nums ${
                            item.status === 'full'
                              ? 'bg-accent-light text-accent border-accent-subtle font-semibold'
                              : item.status === 'zero'
                              ? 'bg-amber-100/90 text-amber-900 border-amber-300 font-semibold'
                              : 'bg-stone-100 text-charcoal border-stone-200'
                          }`}
                        >
                          {item.attendancePercentage !== null
                            ? formatAttendancePercentage(item.attendancePercentage)
                            : '0%'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Interactive Attendance & Safe Bunk Engine Tools */}
          <div className="pt-4 border-t border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-charcoal">Attendance Analysis Tools</h2>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Interactive calculators pre-filled with your semester totals.
                </p>
              </div>

              <div className="inline-flex items-center rounded-lg border border-border bg-background-subtle p-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCalculatorTab('recovery')}
                  aria-pressed={calculatorTab === 'recovery'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 tactile-button ${
                    calculatorTab === 'recovery'
                      ? 'bg-charcoal text-white shadow-2xs font-semibold'
                      : 'text-charcoal-muted hover:text-charcoal hover:bg-white/60'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Recovery Calculator</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCalculatorTab('safebunk')}
                  aria-pressed={calculatorTab === 'safebunk'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 tactile-button ${
                    calculatorTab === 'safebunk'
                      ? 'bg-charcoal text-white shadow-2xs font-semibold'
                      : 'text-charcoal-muted hover:text-charcoal hover:bg-white/60'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Safe Bunk Analyzer</span>
                </button>
              </div>
            </div>

            <div className="tactile-card p-4 sm:p-5">
              {calculatorTab === 'recovery' ? (
                <AttendanceCalculator
                  initialHeld={totalClassesHeldInSemester || 20}
                  initialAttended={overall.totalClassesAttended || 15}
                  initialTarget={averageTarget}
                />
              ) : (
                <SafeBunkCalculator
                  initialHeld={totalClassesHeldInSemester || 24}
                  initialAttended={overall.totalClassesAttended || 21}
                  initialTarget={averageTarget}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
