import React, { useState } from 'react';
import { Subject } from '../../types/subject';
import { SubjectCard } from './SubjectCard';
import { EmptyState } from '../common/EmptyState';
import { calculateSubjectMetrics } from '../../features/attendance/calculations';
import { Search, BookOpen } from 'lucide-react';

interface SubjectListProps {
  subjects: Subject[];
  activeSemesterName?: string | null;
  onAddSubject: () => void;
  onEditSubject: (subject: Subject) => void;
  onDeleteSubject: (subject: Subject) => void;
}

export const SubjectList: React.FC<SubjectListProps> = ({
  subjects,
  activeSemesterName,
  onAddSubject,
  onEditSubject,
  onDeleteSubject,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'eligible' | 'at_risk'>('all');

  // Filter subjects
  const filtered = subjects.filter((sub) => {
    const matchesSearch =
      sub.name.toLowerCase().includes(search.toLowerCase()) ||
      (sub.subjectCode && sub.subjectCode.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;

    const metrics = calculateSubjectMetrics(
      sub.totalClassesHeld,
      sub.totalClassesAttended,
      sub.attendanceTarget
    );

    if (statusFilter === 'eligible') {
      return metrics.status === 'eligible';
    }
    if (statusFilter === 'at_risk') {
      return metrics.status === 'at_risk' || metrics.status === 'ineligible';
    }
    return true;
  });

  // Calculate summary counts
  const eligibleCount = subjects.filter((s) => {
    const m = calculateSubjectMetrics(s.totalClassesHeld, s.totalClassesAttended, s.attendanceTarget);
    return m.status === 'eligible';
  }).length;

  const atRiskCount = subjects.filter((s) => {
    const m = calculateSubjectMetrics(s.totalClassesHeld, s.totalClassesAttended, s.attendanceTarget);
    return m.status === 'at_risk' || m.status === 'ineligible';
  }).length;

  if (subjects.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title={activeSemesterName ? `No subjects in ${activeSemesterName}` : 'No active semester selected'}
        description={
          activeSemesterName
            ? 'Add your course subjects to track classes held, attended, safe bunks, and recovery targets.'
            : 'Select or create an active semester first to begin tracking subjects.'
        }
        action={{
          label: 'Add Subject',
          onClick: onAddSubject,
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and filters bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-charcoal-light absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search subjects or course codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded focus:border-accent text-charcoal outline-none"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-accent text-white'
                : 'text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border'
            }`}
          >
            All ({subjects.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('eligible')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              statusFilter === 'eligible'
                ? 'bg-accent text-white'
                : 'text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border'
            }`}
          >
            Eligible ({eligibleCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('at_risk')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              statusFilter === 'at_risk'
                ? 'bg-accent text-white'
                : 'text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border'
            }`}
          >
            Needs Attention ({atRiskCount})
          </button>
        </div>
      </div>

      {/* Subject cards grid */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center text-xs text-charcoal-muted bg-background-subtle border border-border rounded">
          No subjects match your search or filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onEdit={onEditSubject}
              onDelete={onDeleteSubject}
            />
          ))}
        </div>
      )}
    </div>
  );
};
