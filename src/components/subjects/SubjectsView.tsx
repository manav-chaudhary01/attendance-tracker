import React from 'react';

interface SubjectsViewProps {
  activeSemesterName?: string | null;
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({ activeSemesterName }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Subjects</h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Subject management, attendance targets, and recovery calculations.
          </p>
        </div>
        {activeSemesterName && (
          <span className="text-xs text-charcoal-muted">
            Semester: <strong className="text-charcoal font-medium">{activeSemesterName}</strong>
          </span>
        )}
      </div>

      <div className="bg-background-subtle border border-border rounded p-6 text-center max-w-xl mx-auto my-8">
        <h2 className="text-sm font-medium text-charcoal mb-1">Subject Management</h2>
        <p className="text-xs text-charcoal-muted leading-relaxed">
          Subject creation, editing, safe-bunk indicators, and manual/daily mode controls are scheduled for Stage 3 after the attendance engine validation.
        </p>
      </div>
    </div>
  );
};
