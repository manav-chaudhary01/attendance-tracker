import React, { useState, useEffect } from 'react';
import { Semester } from '../../types/semester';
import { Subject } from '../../types/subject';
import { IStorage } from '../../types/storage';
import { AppRoute } from '../../app/router';
import { DailyAttendanceForm } from './DailyAttendanceForm';
import { AttendanceHistoryList } from './AttendanceHistoryList';
import { EmptyState } from '../common/EmptyState';
import { Calendar, History, PlusCircle } from 'lucide-react';

interface HistoryViewProps {
  activeSemester: Semester | null;
  semesters: Semester[];
  subjects: Subject[];
  storage: IStorage;
  onAttendanceSaved: () => Promise<void>;
  onNavigate: (route: AppRoute) => void;
  initialDate?: string;
  defaultTab?: 'entry' | 'log';
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  activeSemester,
  semesters,
  subjects,
  storage,
  onAttendanceSaved,
  onNavigate,
  initialDate,
  defaultTab = 'entry',
}) => {
  const [activeTab, setActiveTab] = useState<'entry' | 'log'>(defaultTab);
  const [targetDateForEntry, setTargetDateForEntry] = useState<string | undefined>(initialDate);

  useEffect(() => {
    if (initialDate) {
      setTargetDateForEntry(initialDate);
      setActiveTab('entry');
    }
  }, [initialDate]);

  const handleNavigateToDailyDate = (date: string) => {
    setTargetDateForEntry(date);
    setActiveTab('entry');
  };

  return (
    <div className="space-y-6">
      {/* View Header with Sub-Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Attendance History & Logging</h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Log daily class records and inspect complete historical attendance.
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="inline-flex items-center rounded border border-border bg-background p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('entry')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'entry'
                ? 'bg-charcoal text-white shadow-2xs'
                : 'text-charcoal-muted hover:text-charcoal hover:bg-background-subtle'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Daily Entry</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'log'
                ? 'bg-charcoal text-white shadow-2xs'
                : 'text-charcoal-muted hover:text-charcoal hover:bg-background-subtle'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Attendance Log</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Daily Entry Form */}
      {activeTab === 'entry' && (
        <>
          {!activeSemester ? (
            <EmptyState
              icon={Calendar}
              title="No Active Semester Selected"
              description="Daily attendance records are organized by academic term. Please select or create an active semester first."
              action={{
                label: 'Go to Semesters',
                onClick: () => onNavigate('semesters'),
              }}
            />
          ) : (
            <DailyAttendanceForm
              semesterId={activeSemester.id}
              semesterName={activeSemester.name}
              subjects={subjects}
              storage={storage}
              onAttendanceSaved={onAttendanceSaved}
              initialDate={targetDateForEntry}
              onNavigateToSubjects={() => onNavigate('subjects')}
            />
          )}
        </>
      )}

      {/* Tab 2: Attendance History List */}
      {activeTab === 'log' && (
        <AttendanceHistoryList
          semesters={semesters}
          activeSemesterId={activeSemester?.id || null}
          storage={storage}
          onAttendanceChanged={onAttendanceSaved}
          onNavigateToDailyEntry={handleNavigateToDailyDate}
        />
      )}
    </div>
  );
};
