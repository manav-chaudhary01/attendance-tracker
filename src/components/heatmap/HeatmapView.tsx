import React from 'react';

export const HeatmapView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Yearly Heatmap</h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Contribution-style calendar grid tracking attendance consistency throughout the year.
          </p>
        </div>
      </div>

      <div className="bg-background-subtle border border-border rounded p-6 text-center max-w-xl mx-auto my-8">
        <h2 className="text-sm font-medium text-charcoal mb-1">Yearly Activity Heatmap</h2>
        <p className="text-xs text-charcoal-muted leading-relaxed">
          The GitHub/LeetCode-style calendar grid with intensity grading, day inspection, and year switching will be connected to real attendance records in Stage 5.
        </p>
      </div>
    </div>
  );
};
