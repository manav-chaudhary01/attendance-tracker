import React, { useState, useEffect } from 'react';
import { Semester } from '../../types/semester';
import { Subject } from '../../types/subject';
import { IStorage } from '../../types/storage';
import { DailyAttendanceRecord } from '../../types/attendance';
import { AttendanceHeatmap } from './AttendanceHeatmap';

interface HeatmapViewProps {
  semesters: Semester[];
  activeSemester: Semester | null;
  subjects: Subject[];
  storage: IStorage;
  onNavigateToDailyEntry: (date: string) => void;
}

export const HeatmapView: React.FC<HeatmapViewProps> = ({
  semesters,
  activeSemester,
  subjects,
  storage,
  onNavigateToDailyEntry,
}) => {
  const [records, setRecords] = useState<DailyAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadRecords() {
      setIsLoading(true);
      try {
        const allRecords = await storage.getAttendanceRecords();
        setRecords(allRecords);
      } catch (err) {
        console.error('Failed to load records for heatmap:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadRecords();
  }, [storage]);

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

      {isLoading ? (
        <div className="p-12 text-center text-xs text-charcoal-muted animate-pulse bg-background border border-border rounded">
          Loading attendance heatmap...
        </div>
      ) : (
        <AttendanceHeatmap
          records={records}
          subjects={subjects}
          semesters={semesters}
          activeSemesterId={activeSemester?.id}
          onNavigateToDailyEntry={onNavigateToDailyEntry}
        />
      )}
    </div>
  );
};
