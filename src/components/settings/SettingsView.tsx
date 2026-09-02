import React from 'react';

export const SettingsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Settings</h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Local preferences, default attendance targets, and data backup.
          </p>
        </div>
      </div>

      <div className="bg-background-subtle border border-border rounded p-6 text-center max-w-xl mx-auto my-8">
        <h2 className="text-sm font-medium text-charcoal mb-1">Local Storage &amp; Preferences</h2>
        <p className="text-xs text-charcoal-muted leading-relaxed">
          Default target configuration, JSON backup import/export, and storage reset tools will be wired up during Stage 6 polish.
        </p>
      </div>
    </div>
  );
};
