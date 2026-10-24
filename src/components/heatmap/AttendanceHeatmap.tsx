import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DailyAttendanceRecord } from '../../types/attendance';
import { Subject } from '../../types/subject';
import { Semester } from '../../types/semester';
import {
  buildYearlyHeatmapData,
  HeatmapDayCell,
} from '../../features/heatmap/heatmapData';
import { DayDetailsModal } from './DayDetailsModal';
import {
  formatAttendancePercentage,
} from '../../features/attendance/calculations';
import { getTodayLocalDateString } from '../../utils/dates';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Layers,
  BookOpen,
} from 'lucide-react';

interface AttendanceHeatmapProps {
  records: DailyAttendanceRecord[];
  subjects: Subject[];
  semesters: Semester[];
  activeSemesterId?: string | null;
  onNavigateToDailyEntry?: (date: string) => void;
}

export const AttendanceHeatmap: React.FC<AttendanceHeatmapProps> = ({
  records,
  subjects,
  semesters,
  activeSemesterId,
  onNavigateToDailyEntry,
}) => {
  const currentCalendarYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentCalendarYear);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>(
    activeSemesterId || 'all'
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [activeModalDay, setActiveModalDay] = useState<HeatmapDayCell | null>(null);
  const [hoveredDay, setHoveredDay] = useState<HeatmapDayCell | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync selected semester with active semester on initial load
  useEffect(() => {
    if (activeSemesterId && selectedSemesterId === 'all') {
      setSelectedSemesterId(activeSemesterId);
    }
  }, [activeSemesterId]);

  // Filter subjects based on semester selection
  const visibleSubjects = useMemo(() => {
    if (selectedSemesterId === 'all') {
      return subjects;
    }
    return subjects.filter((s) => s.semesterId === selectedSemesterId);
  }, [subjects, selectedSemesterId]);

  // Reset subject filter if current subject does not belong to new semester
  useEffect(() => {
    if (
      selectedSubjectId !== 'all' &&
      !visibleSubjects.some((s) => s.id === selectedSubjectId)
    ) {
      setSelectedSubjectId('all');
    }
  }, [visibleSubjects, selectedSubjectId]);

  // Filter records based on selected semester and subject
  const filteredRecords = useMemo(() => {
    const validSubjectIds = new Set(visibleSubjects.map((s) => s.id));
    let recs = records.filter((r) => validSubjectIds.has(r.subjectId));

    if (selectedSubjectId !== 'all') {
      recs = recs.filter((r) => r.subjectId === selectedSubjectId);
    }

    return recs;
  }, [records, visibleSubjects, selectedSubjectId]);

  // Calculate heatmap data
  const heatmapData = useMemo(() => {
    return buildYearlyHeatmapData({
      year: selectedYear,
      records: filteredRecords,
      subjects: visibleSubjects,
      today: getTodayLocalDateString(),
      weekStartsOn: 1, // Monday
    });
  }, [selectedYear, filteredRecords, visibleSubjects]);

  // Handle cell mouse enter / focus for tooltip
  const handleCellHover = (e: React.MouseEvent | React.FocusEvent, day: HeatmapDayCell) => {
    if (!day.inYear) {
      setHoveredDay(null);
      return;
    }
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };

    setHoveredDay(day);
    setTooltipPos({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
    });
  };

  const handleCellLeave = () => {
    setHoveredDay(null);
    setTooltipPos(null);
  };

  // Helper to determine day cell color classes
  const getCellColorClass = (day: HeatmapDayCell): string => {
    if (!day.inYear) {
      return 'invisible pointer-events-none';
    }

    if (day.isFuture) {
      return 'bg-stone-50/60 border border-dashed border-stone-200/80 opacity-50 cursor-default';
    }

    if (day.status === 'unrecorded') {
      return 'bg-[#f0eee6] border border-[#e4e1d6] hover:border-stone-400';
    }

    if (day.status === 'no_class') {
      return 'bg-[#f0eee6] border border-dashed border-stone-300 hover:border-stone-400';
    }

    if (day.status === 'zero_attendance') {
      return 'bg-amber-100/90 border border-amber-300 text-amber-900 hover:border-amber-500';
    }

    // Forest green intensity scale 1-4
    switch (day.intensity) {
      case 1:
        return 'bg-[#d1e3d7] border border-[#b5d4bf] hover:border-[#8fbf9f]';
      case 2:
        return 'bg-[#8fbf9f] border border-[#74ad87] hover:border-[#4d8f68]';
      case 3:
        return 'bg-[#4d8f68] border border-[#3e7855] hover:border-[#244c36]';
      case 4:
        return 'bg-[#244c36] border border-[#1b3a29] hover:ring-1 hover:ring-[#1b3a29]';
      default:
        return 'bg-[#f0eee6] border border-[#e4e1d6]';
    }
  };

  const { summary } = heatmapData;

  return (
    <div className="space-y-6" ref={containerRef}>
      {/* Controls Bar: Year Navigation and Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded bg-background border border-border shadow-2xs">
        {/* Year Navigator */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y - 1)}
              className="p-1 rounded text-charcoal hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-forest outline-none transition-colors"
              aria-label="Previous Year"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-semibold font-mono text-charcoal min-w-[4rem] text-center">
              {selectedYear}
            </span>
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y + 1)}
              className="p-1 rounded text-charcoal hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-forest outline-none transition-colors"
              aria-label="Next Year"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {selectedYear !== currentCalendarYear && (
            <button
              type="button"
              onClick={() => setSelectedYear(currentCalendarYear)}
              className="text-xs font-medium text-forest hover:text-forest/80 underline underline-offset-2 px-1 py-1"
            >
              Current Year ({currentCalendarYear})
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Semester Selector */}
          <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
            <Layers className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              className="px-2.5 py-1 text-xs rounded border border-border bg-background text-charcoal focus-visible:ring-2 focus-visible:ring-forest outline-none"
              aria-label="Filter by semester"
            >
              <option value="all">All Semesters</option>
              {semesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.name} {sem.status === 'active' ? '(Active)' : '(Archived)'}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selector */}
          <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
            <BookOpen className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-2.5 py-1 text-xs rounded border border-border bg-background text-charcoal focus-visible:ring-2 focus-visible:ring-forest outline-none max-w-[200px] truncate"
              aria-label="Filter by subject"
            >
              <option value="all">All Subjects</option>
              {visibleSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} {sub.subjectCode ? `(${sub.subjectCode})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-background border border-border rounded p-3 text-center">
          <div className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">Held</div>
          <div className="text-lg font-semibold text-charcoal mt-0.5">{summary.totalClassesHeld}</div>
          <div className="text-[10px] text-charcoal-muted mt-0.5">classes scheduled</div>
        </div>

        <div className="bg-background border border-border rounded p-3 text-center">
          <div className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">Attended</div>
          <div className="text-lg font-semibold text-forest mt-0.5">{summary.totalClassesAttended}</div>
          <div className="text-[10px] text-charcoal-muted mt-0.5">classes present</div>
        </div>

        <div className="bg-background border border-border rounded p-3 text-center">
          <div className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">Missed</div>
          <div
            className={`text-lg font-semibold mt-0.5 ${
              summary.totalClassesMissed > 0 ? 'text-amber-800' : 'text-charcoal-muted'
            }`}
          >
            {summary.totalClassesMissed}
          </div>
          <div className="text-[10px] text-charcoal-muted mt-0.5">absences</div>
        </div>

        <div className="bg-background border border-border rounded p-3 text-center">
          <div className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">Annual Rate</div>
          <div className="text-lg font-semibold text-charcoal mt-0.5">
            {summary.overallPercentage !== null
              ? `${formatAttendancePercentage(summary.overallPercentage)}%`
              : '—'}
          </div>
          <div className="text-[10px] text-charcoal-muted mt-0.5">overall consistency</div>
        </div>

        <div className="bg-background border border-border rounded p-3 text-center">
          <div className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider flex items-center justify-center gap-1">
            <span>Active Days</span>
          </div>
          <div className="text-lg font-semibold text-charcoal mt-0.5">{summary.activeDaysCount}</div>
          <div className="text-[10px] text-charcoal-muted mt-0.5">days attended</div>
        </div>

        <div className="bg-background border border-border rounded p-3 text-center">
          <div className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider flex items-center justify-center gap-1">
            <Flame className="w-3 h-3 text-amber-700" />
            <span>Streak</span>
          </div>
          <div className="text-lg font-semibold text-charcoal mt-0.5">
            {summary.longestStreak} <span className="text-xs font-normal text-charcoal-muted">days</span>
          </div>
          <div className="text-[10px] text-charcoal-muted mt-0.5">
            longest consecutive
          </div>
        </div>
      </div>

      {/* GitHub-Style Contribution Heatmap Card */}
      <div className="p-5 rounded bg-background border border-border shadow-2xs relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-charcoal">
              {selectedYear} Attendance Activity
            </h2>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Visualizing daily attendance consistency and frequency across the year.
            </p>
          </div>
        </div>

        {/* Scrollable Grid Container */}
        <div className="overflow-x-auto pb-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-forest rounded">
          <div className="inline-block min-w-full">
            {/* Month Headers */}
            <div className="flex text-[11px] text-charcoal-muted font-medium mb-1.5 pl-8">
              {heatmapData.monthHeaders.map((m, idx) => (
                <div
                  key={`${m.name}-${idx}`}
                  style={{
                    position: 'relative',
                    left: `${m.weekIndex * 15}px`,
                    width: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.name}
                </div>
              ))}
            </div>

            {/* Grid Container: Weekday labels on left + 53 weekly columns */}
            <div className="flex gap-1.5">
              {/* Weekday Row Labels (Mon, Wed, Fri) */}
              <div className="flex flex-col gap-1 text-[10px] font-medium text-charcoal-muted pr-1.5 select-none w-6 text-right">
                <span className="h-3 leading-3">Mon</span>
                <span className="h-3 leading-3 opacity-0">Tue</span>
                <span className="h-3 leading-3">Wed</span>
                <span className="h-3 leading-3 opacity-0">Thu</span>
                <span className="h-3 leading-3">Fri</span>
                <span className="h-3 leading-3 opacity-0">Sat</span>
                <span className="h-3 leading-3">Sun</span>
              </div>

              {/* Weekly Columns */}
              <div
                className="flex gap-1 motion-safe:transition-all"
                role="grid"
                aria-label={`${selectedYear} Attendance Heatmap Grid`}
              >
                {heatmapData.weeks.map((week) => (
                  <div key={week.weekIndex} className="flex flex-col gap-1" role="row">
                    {week.days.map((day) => {
                      const isClickable = day.inYear && !day.isFuture;
                      return (
                        <button
                          key={day.date}
                          type="button"
                          role="gridcell"
                          tabIndex={day.inYear ? 0 : -1}
                          disabled={!day.inYear}
                          aria-label={day.ariaLabel}
                          onClick={() => day.inYear && setActiveModalDay(day)}
                          onMouseEnter={(e) => handleCellHover(e, day)}
                          onMouseLeave={handleCellLeave}
                          onFocus={(e) => handleCellHover(e, day)}
                          onBlur={handleCellLeave}
                          className={`w-3 h-3 rounded-xs outline-none transition-transform duration-100 ${
                            isClickable ? 'cursor-pointer hover:scale-125 hover:z-10' : ''
                          } ${day.isToday ? 'ring-1.5 ring-charcoal/80 ring-offset-1 z-5' : ''} ${
                            getCellColorClass(day)
                          } focus-visible:ring-2 focus-visible:ring-forest focus-visible:z-20`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Tooltip */}
        {hoveredDay && tooltipPos && (
          <div
            style={{
              position: 'absolute',
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
            className="pointer-events-none z-30 px-2.5 py-1.5 rounded bg-charcoal text-white text-[11px] shadow-md whitespace-nowrap space-y-0.5 text-center motion-safe:animate-fadeIn"
            role="tooltip"
          >
            <div className="font-medium text-stone-200">
              {hoveredDay.date}
              {hoveredDay.isToday ? ' (Today)' : ''}
            </div>
            <div className="text-[10px] text-stone-300">
              {hoveredDay.isFuture
                ? 'Future date'
                : hoveredDay.status === 'unrecorded'
                ? 'No classes recorded'
                : hoveredDay.status === 'no_class'
                ? 'No classes scheduled'
                : hoveredDay.status === 'zero_attendance'
                ? `0 of ${hoveredDay.classesHeld} attended (Missed)`
                : `${hoveredDay.classesAttended} of ${hoveredDay.classesHeld} attended (${formatAttendancePercentage(
                    hoveredDay.attendancePercentage || 0
                  )}%)`}
            </div>
            {!hoveredDay.isFuture && (
              <div className="text-[9px] text-stone-400">Click to view day breakdown</div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-3 border-t border-border text-xs text-charcoal-muted">
          <div className="flex items-center gap-3">
            <span className="text-[11px]">Intensity:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">Less</span>
              <div className="flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded-xs bg-[#f0eee6] border border-[#e4e1d6]"
                  title="No classes recorded"
                />
                <span
                  className="w-3 h-3 rounded-xs bg-[#d1e3d7] border border-[#b5d4bf]"
                  title="Level 1"
                />
                <span
                  className="w-3 h-3 rounded-xs bg-[#8fbf9f] border border-[#74ad87]"
                  title="Level 2"
                />
                <span
                  className="w-3 h-3 rounded-xs bg-[#4d8f68] border border-[#3e7855]"
                  title="Level 3"
                />
                <span
                  className="w-3 h-3 rounded-xs bg-[#244c36] border border-[#1b3a29]"
                  title="Level 4 (Highest)"
                />
              </div>
              <span className="text-[10px]">More</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-amber-100/90 border border-amber-300" />
              <span>Missed (0%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-stone-50/60 border border-dashed border-stone-200/80 opacity-60" />
              <span>Future date</span>
            </div>
          </div>
        </div>
      </div>

      {/* Day Details Modal */}
      <DayDetailsModal
        day={activeModalDay}
        isOpen={activeModalDay !== null}
        onClose={() => setActiveModalDay(null)}
        onEditDate={onNavigateToDailyEntry}
      />
    </div>
  );
};
