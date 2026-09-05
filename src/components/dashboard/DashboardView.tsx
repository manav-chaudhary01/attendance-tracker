import React, { useState } from 'react';
import { AppRoute } from '../../app/router';
import { Semester } from '../../types/semester';
import { Subject } from '../../types/subject';
import { AttendanceCalculator } from '../attendance/AttendanceCalculator';
import { SafeBunkCalculator } from '../attendance/SafeBunkCalculator';
import { AttendanceProgress } from '../attendance/AttendanceProgress';
import { EmptyState } from '../common/EmptyState';
import {
  calculateSemesterOverall,
  calculateSubjectMetrics,
  formatAttendancePercentage,
} from '../../features/attendance/calculations';
import { Calculator, ShieldCheck, Plus, BookOpen, CheckCircle2, AlertTriangle } from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (route: AppRoute) => void;
  activeSemester: Semester | null;
  subjects: Subject[];
  onAddSubjectClick?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  activeSemester,
  subjects,
}) => {
  const [calculatorTab, setCalculatorTab] = useState<'recovery' | 'safebunk'>('recovery');

  // Overall attendance calculation
  const overall = calculateSemesterOverall(subjects);

  // Subject status breakdown
  const eligibleSubjects = subjects.filter((s) => {
    const m = calculateSubjectMetrics(s.totalClassesHeld, s.totalClassesAttended, s.attendanceTarget);
    return m.status === 'eligible';
  });

  const atRiskSubjects = subjects.filter((s) => {
    const m = calculateSubjectMetrics(s.totalClassesHeld, s.totalClassesAttended, s.attendanceTarget);
    return m.status === 'at_risk' || m.status === 'ineligible';
  });

  // Calculate average target across active subjects (default 75 if no subjects)
  const averageTarget =
    subjects.length > 0
      ? Math.round(subjects.reduce((sum, s) => sum + s.attendanceTarget, 0) / subjects.length)
      : 75;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Dashboard</h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Active semester attendance overview and quick action center.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeSemester ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-charcoal-muted hidden sm:inline-block">
                Active: <strong className="text-charcoal font-medium">{activeSemester.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => onNavigate('subjects')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded hover:bg-accent-hover transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Add Subject</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('semesters')}
              className="px-3 py-1.5 text-xs font-medium text-accent border border-accent rounded hover:bg-accent-light transition-colors"
            >
              Configure Semester
            </button>
          )}
        </div>
      </div>

      {/* Active Semester Overview or Empty State */}
      {!activeSemester ? (
        <EmptyState
          title="Welcome to Personal Attendance Tracker"
          description="Create your first academic semester to begin organizing subjects and calculating attendance targets."
          action={{
            label: 'Create Semester',
            onClick: () => onNavigate('semesters'),
          }}
        />
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={`No subjects in ${activeSemester.name}`}
          description="Add your course subjects with custom attendance targets (default 75%) to track your classes and safe bunks."
          action={{
            label: 'Add Subject',
            onClick: () => onNavigate('subjects'),
          }}
          secondaryAction={{
            label: 'Switch Semester',
            onClick: () => onNavigate('semesters'),
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Overview Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Overall Attendance */}
            <div className="p-4 bg-background border border-border rounded space-y-2">
              <span className="text-xs text-charcoal-light font-medium block">Overall Attendance</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-charcoal tabular-nums">
                  {formatAttendancePercentage(overall.overallPercentage, { target: averageTarget })}
                </span>
                <span className="text-xs text-charcoal-muted tabular-nums">
                  {overall.totalClassesAttended} / {overall.totalClassesHeld} classes
                </span>
              </div>
              <AttendanceProgress
                classesHeld={overall.totalClassesHeld}
                classesAttended={overall.totalClassesAttended}
                targetPercentage={averageTarget}
                currentPercentage={overall.overallPercentage}
                showLabels={false}
                size="sm"
              />
            </div>

            {/* Meeting Target */}
            <div className="p-4 bg-background border border-border rounded space-y-2">
              <div className="flex items-center justify-between text-xs text-charcoal-light font-medium">
                <span>Meeting Target</span>
                <CheckCircle2 className="w-4 h-4 text-status-eligible" aria-hidden="true" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-status-eligible tabular-nums">
                  {eligibleSubjects.length}
                </span>
                <span className="text-xs text-charcoal-muted">
                  of {subjects.length} subject{subjects.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-[11px] text-charcoal-muted">
                {eligibleSubjects.length === subjects.length
                  ? 'All subjects are currently on track!'
                  : `${subjects.length - eligibleSubjects.length} subject(s) require attention.`}
              </p>
            </div>

            {/* Needs Attention */}
            <div className="p-4 bg-background border border-border rounded space-y-2">
              <div className="flex items-center justify-between text-xs text-charcoal-light font-medium">
                <span>Needs Attention</span>
                <AlertTriangle
                  className={`w-4 h-4 ${atRiskSubjects.length > 0 ? 'text-status-warning' : 'text-charcoal-light'}`}
                  aria-hidden="true"
                />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-2xl font-bold tabular-nums ${
                    atRiskSubjects.length > 0 ? 'text-status-warning' : 'text-charcoal-muted'
                  }`}
                >
                  {atRiskSubjects.length}
                </span>
                <span className="text-xs text-charcoal-muted">
                  below target
                </span>
              </div>
              <p className="text-[11px] text-charcoal-muted">
                {atRiskSubjects.length > 0
                  ? 'Check recovery requirements in Subjects.'
                  : 'No subjects below configured targets.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Attendance & Safe Bunk Engine Tools */}
      <div className="pt-4 border-t border-border space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-charcoal">Attendance Analysis Tools</h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCalculatorTab('recovery')}
              aria-pressed={calculatorTab === 'recovery'}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                calculatorTab === 'recovery'
                  ? 'bg-accent text-white font-semibold'
                  : 'text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Recovery Calculator</span>
            </button>
            <button
              type="button"
              onClick={() => setCalculatorTab('safebunk')}
              aria-pressed={calculatorTab === 'safebunk'}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                calculatorTab === 'safebunk'
                  ? 'bg-accent text-white font-semibold'
                  : 'text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Safe Bunk Analyzer</span>
            </button>
          </div>
        </div>

        {calculatorTab === 'recovery' ? (
          <AttendanceCalculator
            initialHeld={overall.totalClassesHeld || 20}
            initialAttended={overall.totalClassesAttended || 14}
            initialTarget={averageTarget}
          />
        ) : (
          <SafeBunkCalculator
            initialHeld={overall.totalClassesHeld || 24}
            initialAttended={overall.totalClassesAttended || 21}
            initialTarget={averageTarget}
          />
        )}
      </div>
    </div>
  );
};
