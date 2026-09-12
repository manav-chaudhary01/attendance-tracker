import React, { useState } from 'react';
import { Semester } from '../../types/semester';
import { Subject } from '../../types/subject';
import { Check, Archive, RotateCcw, Trash2, Edit2, Calendar, BookOpen } from 'lucide-react';

interface SemesterListProps {
  semesters: Semester[];
  activeSemesterId: string | null;
  subjects: Subject[];
  onSetActive: (id: string) => void;
  onEdit: (semester: Semester) => void;
  onArchive: (semester: Semester) => void;
  onUnarchive: (semester: Semester) => void;
  onDelete: (semester: Semester) => void;
}

export const SemesterList: React.FC<SemesterListProps> = ({
  semesters,
  activeSemesterId,
  subjects,
  onSetActive,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}) => {
  const [tab, setTab] = useState<'active' | 'archived'>('active');

  const activeSemesters = semesters.filter((s) => s.status === 'active');
  const archivedSemesters = semesters.filter((s) => s.status === 'archived');
  const currentList = tab === 'active' ? activeSemesters : archivedSemesters;

  const getSubjectCount = (semesterId: string) => {
    return subjects.filter((sub) => sub.semesterId === semesterId).length;
  };

  return (
    <div className="space-y-4">
      {/* Tab filter */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
        <button
          type="button"
          onClick={() => setTab('active')}
          aria-pressed={tab === 'active'}
          className={`px-3 py-1.5 rounded-md font-medium transition-all duration-150 tactile-button ${
            tab === 'active'
              ? 'bg-accent text-white font-semibold shadow-2xs'
              : 'text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border'
          }`}
        >
          Active Semesters ({activeSemesters.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('archived')}
          aria-pressed={tab === 'archived'}
          className={`px-3 py-1.5 rounded-md font-medium transition-all duration-150 tactile-button ${
            tab === 'archived'
              ? 'bg-accent text-white font-semibold shadow-2xs'
              : 'text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border'
          }`}
        >
          Archived Semesters ({archivedSemesters.length})
        </button>
      </div>

      {/* Empty list notice */}
      {currentList.length === 0 ? (
        <div className="p-8 text-center text-xs text-charcoal-muted bg-background-subtle border border-border rounded-md">
          {tab === 'active'
            ? 'No active semesters found. Create one above to get started.'
            : 'No archived semesters yet. When a term ends, you can archive it here.'}
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((semester) => {
            const isCurrentlyActive = semester.id === activeSemesterId;
            const subjectCount = getSubjectCount(semester.id);

            return (
              <div
                key={semester.id}
                className={`interactive-card p-4 sm:p-5 transition-all duration-200 ${
                  isCurrentlyActive
                    ? 'border-accent bg-accent-light/10 shadow-xs ring-1 ring-accent/30'
                    : 'hover:border-border-strong'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Left Column: Info */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-charcoal">
                        {semester.name}
                      </h3>
                      {isCurrentlyActive && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-accent-light text-accent border border-accent-subtle">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-subtle-pulse" aria-hidden="true" />
                          <Check className="w-3 h-3" aria-hidden="true" />
                          Current Active
                        </span>
                      )}
                      {semester.academicYear && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-background-subtle text-charcoal-muted border border-border">
                          {semester.academicYear}
                        </span>
                      )}
                      {semester.status === 'archived' && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-background-subtle text-charcoal-light border border-border">
                          Archived
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-charcoal-muted">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-charcoal-light" aria-hidden="true" />
                        <span>
                          {subjectCount} subject{subjectCount === 1 ? '' : 's'}
                        </span>
                      </span>

                      {(semester.startDate || semester.endDate) && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-charcoal-light" aria-hidden="true" />
                          <span>
                            {semester.startDate || 'Start'} → {semester.endDate || 'End'}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                    {semester.status === 'active' && !isCurrentlyActive && (
                      <button
                        type="button"
                        onClick={() => onSetActive(semester.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-accent-light text-accent border border-accent-subtle rounded-md hover:bg-accent hover:text-white transition-all duration-150 tactile-button"
                      >
                        Set Active
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onEdit(semester)}
                      className="p-1.5 text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border rounded-md transition-all duration-150 tactile-button"
                      title="Edit semester"
                      aria-label={`Edit ${semester.name}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>

                    {semester.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => onArchive(semester)}
                        className="p-1.5 text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border rounded-md transition-all duration-150 tactile-button"
                        title="Archive semester"
                        aria-label={`Archive ${semester.name}`}
                      >
                        <Archive className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUnarchive(semester)}
                        className="p-1.5 text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border rounded-md transition-all duration-150 tactile-button"
                        title="Restore semester to active"
                        aria-label={`Restore ${semester.name}`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onDelete(semester)}
                      className="p-1.5 text-[#a83232] hover:bg-status-ineligibleBg border border-border rounded-md transition-all duration-150 tactile-button"
                      title="Delete semester"
                      aria-label={`Delete ${semester.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
