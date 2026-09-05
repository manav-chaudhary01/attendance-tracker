import React, { useState } from 'react';
import { Subject, CreateSubjectInput } from '../../types/subject';
import { Semester } from '../../types/semester';
import { AppRoute } from '../../app/router';
import { SubjectList } from './SubjectList';
import { SubjectForm } from './SubjectForm';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { Plus, Calendar } from 'lucide-react';

interface SubjectsViewProps {
  activeSemester: Semester | null;
  subjects: Subject[];
  defaultAttendanceTarget?: number;
  onNavigate: (route: AppRoute) => void;
  onCreateSubject: (input: CreateSubjectInput) => Promise<void>;
  onUpdateSubject: (id: string, input: CreateSubjectInput) => Promise<void>;
  onDeleteSubject: (id: string) => Promise<void>;
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  activeSemester,
  subjects,
  defaultAttendanceTarget = 75,
  onNavigate,
  onCreateSubject,
  onUpdateSubject,
  onDeleteSubject,
}) => {
  const [formOpen, setFormOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const handleOpenCreate = () => {
    setSubjectToEdit(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setSubjectToEdit(subject);
    setFormOpen(true);
  };

  const handleFormSave = async (input: CreateSubjectInput) => {
    if (subjectToEdit) {
      await onUpdateSubject(subjectToEdit.id, input);
    } else {
      await onCreateSubject(input);
    }
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await onDeleteSubject(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  if (!activeSemester) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl font-semibold text-charcoal">Subjects</h1>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Subject management, attendance targets, and recovery calculations.
            </p>
          </div>
        </div>

        <EmptyState
          icon={Calendar}
          title="No Active Semester Selected"
          description="Subjects must belong to an active semester. Please select or create an academic semester first."
          action={{
            label: 'Go to Semesters',
            onClick: () => onNavigate('semesters'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Subjects</h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Active semester: <strong className="text-charcoal font-medium">{activeSemester.name}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded hover:bg-accent-hover transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      {/* Subject List */}
      <SubjectList
        subjects={subjects}
        activeSemesterName={activeSemester.name}
        onAddSubject={handleOpenCreate}
        onEditSubject={handleOpenEdit}
        onDeleteSubject={(sub) => setDeleteTarget(sub)}
      />

      {/* Subject Form Modal */}
      <SubjectForm
        isOpen={formOpen}
        semesterId={activeSemester.id}
        subjectToEdit={subjectToEdit}
        existingSubjectsInSemester={subjects}
        defaultTarget={defaultAttendanceTarget}
        onSave={handleFormSave}
        onClose={() => setFormOpen(false)}
      />

      {/* Delete Subject Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Subject?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All associated attendance records for this subject will be permanently deleted.`}
        confirmLabel="Delete Subject"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
