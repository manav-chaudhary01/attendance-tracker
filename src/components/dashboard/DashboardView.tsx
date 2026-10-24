import React from 'react';
import { AppRoute } from '../../app/router';

interface DashboardViewProps {
  onNavigate: (route: AppRoute) => void;
  activeSemesterName?: string | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  activeSemesterName,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Dashboard</h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Active semester attendance overview and quick action center.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('semesters')}
            className="px-3 py-1.5 text-xs font-medium text-accent border border-accent rounded hover:bg-accent-light transition-colors"
          >
            Manage Semesters
          </button>
        </div>
      </div>

      {/* Foundation State / Empty State */}
      <div className="bg-background-subtle border border-border rounded p-6 text-center max-w-xl mx-auto my-8">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-accent-light text-accent mb-3">
          <span className="font-semibold text-sm">AT</span>
        </div>
        <h2 className="text-base font-medium text-charcoal mb-1">
          {activeSemesterName ? `Active: ${activeSemesterName}` : 'Welcome to Personal Attendance Tracker'}
        </h2>
        <p className="text-xs text-charcoal-muted mb-5 leading-relaxed">
          Stage 1 Foundation is initialized with verified core calculation modules and IndexedDB persistence.
          {activeSemesterName
            ? ' Add your subjects to start tracking classes and safe bunks.'
            : ' Start by configuring your first academic semester.'}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('semesters')}
            className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded hover:bg-accent-hover transition-colors"
          >
            Go to Semesters
          </button>
          <button
            type="button"
            onClick={() => onNavigate('subjects')}
            className="px-3 py-1.5 text-xs font-medium bg-background border border-border text-charcoal rounded hover:bg-background-subtle transition-colors"
          >
            View Subjects
          </button>
        </div>
      </div>
    </div>
  );
};
