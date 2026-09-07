import React from 'react';
import { Semester } from '../../types/semester';
import { Subject } from '../../types/subject';
import { IStorage } from '../../types/storage';
import { AppRoute } from '../../app/router';
import { DailyAttendanceForm } from './DailyAttendanceForm';
import { EmptyState } from '../common/EmptyState';
import { Calendar } from 'lucide-react';

interface HistoryViewProps {
  activeSemester: Semester | null;
  subjects: Subject[];
  storage: IStorage;
  onAttendanceSaved: () => Promise<void>;
  onNavigate: (route: AppRoute) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  activeSemester,
  subjects,
  storage,
  onAttendanceSaved,
  onNavigate,
}) => {
  if (!activeSemester) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-border">
          <h1 className="text-xl font-semibold text-charcoal">Daily Attendance</h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Record and update class attendance per date.
          </p>
        </div>

        <EmptyState
          icon={Calendar}
          title="No Active Semester Selected"
          description="Daily attendance records are organized by academic term. Please select or create an active semester first."
          action={{
            label: 'Go to Semesters',
            onClick: () => onNavigate('semesters'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Daily Attendance</h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Quick class logging for active semester: <strong className="text-charcoal font-medium">{activeSemester.name}</strong>
          </p>
        </div>
      </div>

      {/* Daily Attendance Form Component */}
      <DailyAttendanceForm
        semesterId={activeSemester.id}
        semesterName={activeSemester.name}
        subjects={subjects}
        storage={storage}
        onAttendanceSaved={onAttendanceSaved}
        onNavigateToSubjects={() => onNavigate('subjects')}
      />
    </div>
  );
};
