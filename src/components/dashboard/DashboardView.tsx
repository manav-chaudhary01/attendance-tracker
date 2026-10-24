import React, { useState } from 'react';
import { AppRoute } from '../../app/router';
import { AttendanceCalculator } from '../attendance/AttendanceCalculator';
import { SafeBunkCalculator } from '../attendance/SafeBunkCalculator';
import { Calculator, ShieldCheck } from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (route: AppRoute) => void;
  activeSemesterName?: string | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  activeSemesterName,
}) => {
  const [calculatorTab, setCalculatorTab] = useState<'recovery' | 'safebunk'>('recovery');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Attendance Engine</h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Interactive recovery modeling, safe-bunk analysis, and target eligibility calculator.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeSemesterName ? (
            <span className="text-xs text-charcoal-muted">
              Active semester: <strong className="text-charcoal font-medium">{activeSemesterName}</strong>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('semesters')}
              className="px-3 py-1.5 text-xs font-medium text-accent border border-accent rounded hover:bg-accent-light transition-colors"
            >
              Configure Semesters
            </button>
          )}
        </div>
      </div>

      {/* Tool Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setCalculatorTab('recovery')}
          aria-pressed={calculatorTab === 'recovery'}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            calculatorTab === 'recovery'
              ? 'bg-accent text-white font-semibold'
              : 'text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Recovery &amp; Target Calculator</span>
        </button>

        <button
          type="button"
          onClick={() => setCalculatorTab('safebunk')}
          aria-pressed={calculatorTab === 'safebunk'}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            calculatorTab === 'safebunk'
              ? 'bg-accent text-white font-semibold'
              : 'text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Safe Bunk Analyzer</span>
        </button>
      </div>

      {/* Active Calculator Component */}
      {calculatorTab === 'recovery' ? (
        <AttendanceCalculator
          initialHeld={20}
          initialAttended={14}
          initialTarget={75}
        />
      ) : (
        <SafeBunkCalculator
          initialHeld={24}
          initialAttended={21}
          initialTarget={75}
        />
      )}
    </div>
  );
};
