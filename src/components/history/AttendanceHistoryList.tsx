import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Semester } from '../../types/semester';
import { Subject } from '../../types/subject';
import { IStorage } from '../../types/storage';
import {
  getAttendanceHistory,
  AttendanceHistoryItem,
  deleteAttendanceRecordAndSync,
  updateAttendanceRecordAndSync,
} from '../../features/history/attendanceService';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import {
  formatDateForDisplay,
  getRelativeDateBadge,
  getTodayLocalDateString,
  addDays,
} from '../../utils/dates';
import { formatAttendancePercentage } from '../../features/attendance/calculations';
import {
  Filter,
  Calendar,
  Search,
  RotateCcw,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
} from 'lucide-react';

interface AttendanceHistoryListProps {
  semesters: Semester[];
  activeSemesterId: string | null;
  storage: IStorage;
  onAttendanceChanged: () => Promise<void>;
  onNavigateToDailyEntry?: (date: string) => void;
}

export const AttendanceHistoryList: React.FC<AttendanceHistoryListProps> = ({
  semesters,
  activeSemesterId,
  storage,
  onAttendanceChanged,
  onNavigateToDailyEntry,
}) => {
  const today = getTodayLocalDateString();

  // Filters state
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>(
    activeSemesterId || 'all'
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data state
  const [records, setRecords] = useState<AttendanceHistoryItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Quick edit modal state
  const [editingItem, setEditingItem] = useState<AttendanceHistoryItem | null>(null);
  const [editHeld, setEditHeld] = useState<number>(1);
  const [editAttended, setEditAttended] = useState<number>(1);
  const [editNotes, setEditNotes] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  // Deletion modal state
  const [deletingItem, setDeletingItem] = useState<AttendanceHistoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load subjects for the selected semester
  useEffect(() => {
    async function loadSubjects() {
      try {
        const subs =
          selectedSemesterId === 'all'
            ? await storage.getSubjects()
            : await storage.getSubjects(selectedSemesterId);
        setSubjects(subs);
      } catch (err) {
        console.error('Failed to load subjects:', err);
      }
    }
    loadSubjects();
  }, [selectedSemesterId, storage]);

  // Load history records
  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setActionErrorMsg(null);
    try {
      const filters = {
        semesterId: selectedSemesterId === 'all' ? undefined : selectedSemesterId,
        subjectId: selectedSubjectId === 'all' ? undefined : selectedSubjectId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const history = await getAttendanceHistory(filters, storage);
      setRecords(history);
    } catch (err) {
      setActionErrorMsg(err instanceof Error ? err.message : 'Failed to load attendance history.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSemesterId, selectedSubjectId, startDate, endDate, storage]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Client-side text search filter (subject name, code, notes)
  const visibleRecords = useMemo(() => {
    if (!searchQuery.trim()) {
      return records;
    }
    const q = searchQuery.toLowerCase().trim();
    return records.filter(
      (r) =>
        r.subjectName.toLowerCase().includes(q) ||
        (r.subjectCode && r.subjectCode.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q)) ||
        r.date.includes(q)
    );
  }, [records, searchQuery]);

  // Summary counts for filtered records
  const summaryStats = useMemo(() => {
    let held = 0;
    let attended = 0;
    for (const r of visibleRecords) {
      held += r.classesHeld;
      attended += r.classesAttended;
    }
    const missed = Math.max(0, held - attended);
    const pct = held > 0 ? (attended / held) * 100 : null;
    return {
      totalRecords: visibleRecords.length,
      held,
      attended,
      missed,
      pct,
    };
  }, [visibleRecords]);

  // Preset date handlers
  const handlePresetAllTime = () => {
    setStartDate('');
    setEndDate('');
  };

  const handlePresetLast7Days = () => {
    setStartDate(addDays(today, -6));
    setEndDate(today);
  };

  const handlePresetLast30Days = () => {
    setStartDate(addDays(today, -29));
    setEndDate(today);
  };

  const handlePresetThisMonth = () => {
    const [y, m] = today.split('-');
    setStartDate(`${y}-${m}-01`);
    setEndDate(today);
  };

  // Edit action
  const handleOpenEdit = (item: AttendanceHistoryItem) => {
    setEditingItem(item);
    setEditHeld(item.classesHeld);
    setEditAttended(item.classesAttended);
    setEditNotes(item.notes || '');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (editHeld < 0 || !Number.isInteger(editHeld)) {
      setEditError('Classes held must be a non-negative whole number.');
      return;
    }
    if (editAttended < 0 || !Number.isInteger(editAttended)) {
      setEditError('Classes attended must be a non-negative whole number.');
      return;
    }
    if (editAttended > editHeld) {
      setEditError('Classes attended cannot exceed classes held.');
      return;
    }

    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      await updateAttendanceRecordAndSync(
        editingItem.id,
        {
          classesHeld: editHeld,
          classesAttended: editAttended,
          notes: editNotes,
        },
        storage
      );

      setEditingItem(null);
      setActionSuccessMsg(`Updated attendance for ${editingItem.subjectName} on ${editingItem.date}.`);
      await onAttendanceChanged();
      await loadHistory();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update attendance record.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete action
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await deleteAttendanceRecordAndSync(deletingItem.id, storage);
      setActionSuccessMsg(`Deleted attendance record for ${deletingItem.subjectName} on ${deletingItem.date}.`);
      setDeletingItem(null);
      await onAttendanceChanged();
      await loadHistory();
    } catch (err) {
      setActionErrorMsg(err instanceof Error ? err.message : 'Failed to delete attendance record.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {actionSuccessMsg && (
        <div
          role="status"
          className="flex items-center justify-between p-3 rounded bg-forest/10 border border-forest/20 text-forest text-xs motion-safe:animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="p-1 rounded hover:bg-forest/20"
            aria-label="Dismiss alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionErrorMsg && (
        <div
          role="alert"
          className="flex items-center justify-between p-3 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs motion-safe:animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
            <span>{actionErrorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionErrorMsg(null)}
            className="p-1 rounded hover:bg-amber-200"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="tactile-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
            <Filter className="w-3.5 h-3.5 text-forest" />
            <span>Filter Attendance History</span>
          </div>
          {(selectedSemesterId !== 'all' ||
            selectedSubjectId !== 'all' ||
            startDate !== '' ||
            endDate !== '' ||
            searchQuery !== '') && (
            <button
              type="button"
              onClick={() => {
                setSelectedSemesterId(activeSemesterId || 'all');
                setSelectedSubjectId('all');
                setStartDate('');
                setEndDate('');
                setSearchQuery('');
              }}
              className="text-xs text-charcoal-muted hover:text-charcoal underline underline-offset-2 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Semester Filter */}
          <div className="space-y-1">
            <label htmlFor="history-filter-sem" className="block text-charcoal-muted font-medium">
              Semester
            </label>
            <select
              id="history-filter-sem"
              value={selectedSemesterId}
              onChange={(e) => {
                setSelectedSemesterId(e.target.value);
                setSelectedSubjectId('all');
              }}
              className="w-full px-2.5 py-1.5 rounded border border-border bg-background text-charcoal focus-visible:ring-2 focus-visible:ring-forest outline-none"
            >
              <option value="all">All Semesters</option>
              {semesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.name} {sem.status === 'active' ? '(Active)' : '(Archived)'}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div className="space-y-1">
            <label htmlFor="history-filter-sub" className="block text-charcoal-muted font-medium">
              Subject
            </label>
            <select
              id="history-filter-sub"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-border bg-background text-charcoal focus-visible:ring-2 focus-visible:ring-forest outline-none"
            >
              <option value="all">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} {sub.subjectCode ? `(${sub.subjectCode})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range: Start */}
          <div className="space-y-1">
            <label htmlFor="history-filter-start" className="block text-charcoal-muted font-medium">
              From Date
            </label>
            <input
              id="history-filter-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1 rounded border border-border bg-background text-charcoal focus-visible:ring-2 focus-visible:ring-forest outline-none font-mono text-xs"
            />
          </div>

          {/* Date Range: End */}
          <div className="space-y-1">
            <label htmlFor="history-filter-end" className="block text-charcoal-muted font-medium">
              To Date
            </label>
            <input
              id="history-filter-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1 rounded border border-border bg-background text-charcoal focus-visible:ring-2 focus-visible:ring-forest outline-none font-mono text-xs"
            />
          </div>
        </div>

        {/* Quick Date Presets & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          {/* Quick Range Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-charcoal-muted mr-1">Range:</span>
            <button
              type="button"
              onClick={handlePresetAllTime}
              className={`px-2 py-0.5 rounded text-[11px] border ${
                !startDate && !endDate
                  ? 'bg-charcoal text-white border-charcoal'
                  : 'bg-background-subtle text-charcoal-muted border-border hover:bg-stone-100'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={handlePresetLast7Days}
              className="px-2 py-0.5 rounded text-[11px] bg-background-subtle text-charcoal-muted border border-border hover:bg-stone-100"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={handlePresetLast30Days}
              className="px-2 py-0.5 rounded text-[11px] bg-background-subtle text-charcoal-muted border border-border hover:bg-stone-100"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={handlePresetThisMonth}
              className="px-2 py-0.5 rounded text-[11px] bg-background-subtle text-charcoal-muted border border-border hover:bg-stone-100"
            >
              This Month
            </button>
          </div>

          {/* Search Box */}
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              placeholder="Search keyword, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs rounded border border-border bg-background text-charcoal placeholder-stone-400 focus-visible:ring-2 focus-visible:ring-forest outline-none"
              aria-label="Search records"
            />
          </div>
        </div>
      </div>

      {/* Summary Stat Line */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-charcoal-muted">
        <div>
          Showing <strong className="text-charcoal font-semibold">{summaryStats.totalRecords}</strong>{' '}
          recorded session{summaryStats.totalRecords !== 1 ? 's' : ''}
        </div>
        {summaryStats.totalRecords > 0 && (
          <div className="flex items-center gap-3">
            <span>
              Held: <strong className="text-charcoal font-medium">{summaryStats.held}</strong>
            </span>
            <span>
              Attended: <strong className="text-forest font-medium">{summaryStats.attended}</strong>
            </span>
            <span>
              Missed: <strong className="text-amber-800 font-medium">{summaryStats.missed}</strong>
            </span>
            <span>
              Rate:{' '}
              <strong className="text-charcoal font-medium">
                {summaryStats.pct !== null ? formatAttendancePercentage(summaryStats.pct) : '—'}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* History Records Table */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-charcoal-muted animate-pulse bg-background border border-border rounded">
          Loading attendance records...
        </div>
      ) : visibleRecords.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Attendance Records Found"
          description={
            records.length === 0
              ? 'No daily attendance records have been logged yet for the selected filters.'
              : 'No records match your search criteria. Try adjusting or clearing your filters.'
          }
        />
      ) : (
        <div className="overflow-x-auto border border-border rounded bg-background shadow-2xs">
          <table className="w-full text-left text-xs divide-y divide-border">
            <caption className="sr-only">Attendance history log and records</caption>
            <thead className="bg-background-subtle text-[11px] font-semibold text-charcoal uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-3.5 py-2.5">
                  Date
                </th>
                <th scope="col" className="px-3.5 py-2.5">
                  Subject
                </th>
                <th scope="col" className="px-3 py-2.5 text-center">
                  Held
                </th>
                <th scope="col" className="px-3 py-2.5 text-center">
                  Attended
                </th>
                <th scope="col" className="px-3 py-2.5 text-center">
                  Missed
                </th>
                <th scope="col" className="px-3 py-2.5 text-center">
                  Rate
                </th>
                <th scope="col" className="px-3.5 py-2.5">
                  Notes
                </th>
                <th scope="col" className="px-3.5 py-2.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleRecords.map((item) => {
                const relativeBadge = getRelativeDateBadge(item.date);
                const isZero = item.status === 'zero';
                const isFull = item.status === 'full';

                return (
                  <tr key={item.id} className="hover:bg-background-subtle/60 transition-colors">
                    {/* Date */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-medium text-charcoal">{item.date}</span>
                        {relativeBadge && (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-forest/10 text-forest border border-forest/20 font-medium">
                            {relativeBadge}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-charcoal-muted">
                        {formatDateForDisplay(item.date, { includeWeekday: true, includeYear: false })}
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium text-charcoal">{item.subjectName}</div>
                      <div className="text-[10px] text-charcoal-muted flex items-center gap-1">
                        {item.subjectCode && <span className="font-mono">{item.subjectCode} • </span>}
                        <span>{item.semesterName}</span>
                      </div>
                    </td>

                    {/* Held */}
                    <td className="px-3 py-2.5 text-center font-mono font-medium text-charcoal">
                      {item.classesHeld}
                    </td>

                    {/* Attended */}
                    <td className="px-3 py-2.5 text-center font-mono font-medium text-forest">
                      {item.classesAttended}
                    </td>

                    {/* Missed */}
                    <td
                      className={`px-3 py-2.5 text-center font-mono font-medium ${
                        item.classesMissed > 0 ? 'text-amber-800' : 'text-charcoal-muted'
                      }`}
                    >
                      {item.classesMissed}
                    </td>

                    {/* Rate Badge */}
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      {item.attendancePercentage !== null ? (
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                            isFull
                              ? 'bg-forest/10 text-forest border-forest/20'
                              : isZero
                              ? 'bg-amber-100/90 text-amber-900 border-amber-300'
                              : 'bg-stone-100 text-charcoal border-stone-200'
                          }`}
                        >
                          {formatAttendancePercentage(item.attendancePercentage)}%
                        </span>
                      ) : (
                        <span className="text-charcoal-muted">—</span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="px-3.5 py-2.5 max-w-xs truncate text-charcoal-muted">
                      {item.notes ? (
                        <span title={item.notes} className="italic text-charcoal">
                          {item.notes}
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {/* Quick Edit */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 text-charcoal-muted hover:text-charcoal rounded hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-forest outline-none transition-colors"
                          title="Edit record"
                          aria-label={`Edit attendance for ${item.subjectName} on ${item.date}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Open in Daily Logger */}
                        {onNavigateToDailyEntry && (
                          <button
                            type="button"
                            onClick={() => onNavigateToDailyEntry(item.date)}
                            className="p-1 text-charcoal-muted hover:text-forest rounded hover:bg-forest/10 focus-visible:ring-2 focus-visible:ring-forest outline-none transition-colors"
                            title="Open full day in Daily Logger"
                            aria-label={`Open daily logger for ${item.date}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Record */}
                        <button
                          type="button"
                          onClick={() => setDeletingItem(item)}
                          className="p-1 text-charcoal-muted hover:text-red-700 rounded hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-600 outline-none transition-colors"
                          title="Delete record"
                          aria-label={`Delete record for ${item.subjectName} on ${item.date}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Edit Dialog */}
      {editingItem && (
        <div
          role="dialog"
          aria-labelledby="edit-record-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs motion-safe:animate-fadeIn"
        >
          <div className="bg-white border border-border rounded-lg shadow-xl max-w-md w-full p-5 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 id="edit-record-title" className="text-sm font-semibold text-charcoal">
                Edit Attendance Record
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 text-charcoal-muted hover:text-charcoal rounded"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="bg-background-subtle p-3 rounded border border-border text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-charcoal-muted">Subject:</span>
                  <span className="font-semibold text-charcoal">{editingItem.subjectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-muted">Date:</span>
                  <span className="font-mono font-medium text-charcoal">{editingItem.date}</span>
                </div>
              </div>

              {editError && (
                <div
                  role="alert"
                  className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label htmlFor="edit-held" className="block font-medium text-charcoal">
                    Classes Held
                  </label>
                  <input
                    id="edit-held"
                    type="number"
                    min="0"
                    step="1"
                    value={editHeld}
                    onChange={(e) => setEditHeld(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2.5 py-1.5 rounded border border-border bg-background text-charcoal focus-visible:ring-2 focus-visible:ring-forest outline-none font-mono"
                    required
                  />
                  <p className="text-[10px] text-charcoal-muted">0 indicates No Class (deletes record)</p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-attended" className="block font-medium text-charcoal">
                    Classes Attended
                  </label>
                  <input
                    id="edit-attended"
                    type="number"
                    min="0"
                    max={editHeld}
                    step="1"
                    value={editAttended}
                    onChange={(e) => setEditAttended(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2.5 py-1.5 rounded border border-border bg-background text-charcoal focus-visible:ring-2 focus-visible:ring-forest outline-none font-mono"
                    required
                  />
                  <p className="text-[10px] text-charcoal-muted">Between 0 and held</p>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label htmlFor="edit-notes" className="block font-medium text-charcoal">
                  Notes (optional)
                </label>
                <textarea
                  id="edit-notes"
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Reason for absence, lab topic, etc."
                  className="w-full px-2.5 py-1.5 rounded border border-border bg-background text-charcoal placeholder-stone-400 focus-visible:ring-2 focus-visible:ring-forest outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                {onNavigateToDailyEntry ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      onNavigateToDailyEntry(editingItem.date);
                    }}
                    className="text-xs text-forest hover:text-forest/80 underline underline-offset-2 flex items-center gap-1"
                  >
                    <span>Edit full day in Daily Logger</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    disabled={isSubmittingEdit}
                    className="px-3 py-1.5 text-xs text-charcoal-muted hover:text-charcoal border border-border rounded hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-forest outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-forest text-white rounded hover:bg-forest/90 focus-visible:ring-2 focus-visible:ring-forest outline-none shadow-xs disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSubmittingEdit ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingItem !== null}
        title="Delete Attendance Record"
        message={
          deletingItem
            ? `Are you sure you want to delete the attendance record for ${deletingItem.subjectName} on ${deletingItem.date} (${deletingItem.classesAttended} attended of ${deletingItem.classesHeld} held)? This will automatically adjust ${deletingItem.subjectName}'s aggregate attendance counts to keep your metrics accurate.`
            : ''
        }
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Record'}
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingItem(null)}
      />
    </div>
  );
};
