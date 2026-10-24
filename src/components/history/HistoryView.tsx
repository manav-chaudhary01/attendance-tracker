import React from 'react';

export const HistoryView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Attendance History</h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Log and review daily class attendance records with date and subject filters.
          </p>
        </div>
      </div>

      <div className="bg-background-subtle border border-border rounded p-6 text-center max-w-xl mx-auto my-8">
        <h2 className="text-sm font-medium text-charcoal mb-1">Daily Log History</h2>
        <p className="text-xs text-charcoal-muted leading-relaxed">
          Daily attendance recording, multi-subject daily logging, and date-filtered historical correction will be implemented in Stages 4 and 5.
        </p>
      </div>
    </div>
  );
};
