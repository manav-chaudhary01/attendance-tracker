import React, { useState } from 'react';
import { Semester, CreateSemesterInput } from '../../types/semester';
import { Subject } from '../../types/subject';
import { SemesterList } from './SemesterList';
import { SemesterForm } from './SemesterForm';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Plus } from 'lucide-react';

interface SemestersViewProps {
  semesters: Semester[];
  activeSemesterName?: string | null;
  activeSemesterId: string | null;
  subjects: Subject[];
  onSetActive: (id: string) => Promise<void>;
  onCreateSemester: (input: CreateSemesterInput, makeActive?: boolean) => Promise<void>;
  onUpdateSemester: (id: string, input: CreateSemesterInput) => Promise<void>;
  onArchiveSemester: (id: string) => Promise<void>;
  onUnarchiveSemester: (id: string) => Promise<void>;
  onDeleteSemester: (id: string) => Promise<void>;
}

export const SemestersView: React.FC<SemestersViewProps> = ({
  semesters,
  activeSemesterName,
  activeSemesterId,
  subjects,
  onSetActive,
  onCreateSemester,
  onUpdateSemester,
  onArchiveSemester,
  onUnarchiveSemester,
  onDeleteSemester,
}) => {
  const [formOpen, setFormOpen] = useState(false);
  const [semesterToEdit, setSemesterToEdit] = useState<Semester | null>(null);

  // Confirmation dialog states
  const [deleteTarget, setDeleteTarget] = useState<Semester | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Semester | null>(null);

  const handleOpenCreate = () => {
    setSemesterToEdit(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (semester: Semester) => {
    setSemesterToEdit(semester);
    setFormOpen(true);
  };

  const handleFormSave = async (input: CreateSemesterInput, makeActive?: boolean) => {
    if (semesterToEdit) {
      await onUpdateSemester(semesterToEdit.id, input);
    } else {
      await onCreateSemester(input, makeActive);
    }
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await onDeleteSemester(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const confirmArchive = async () => {
    if (archiveTarget) {
      await onArchiveSemester(archiveTarget.id);
      setArchiveTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Semesters</h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Organize attendance by academic term with full data isolation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeSemesterName && (
            <span className="hidden sm:inline-block text-xs text-charcoal-muted mr-2">
              Active: <strong className="text-charcoal font-medium">{activeSemesterName}</strong>
            </span>
          )}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded hover:bg-accent-hover transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add Semester</span>
          </button>
        </div>
      </div>

      {/* Semester List */}
      <SemesterList
        semesters={semesters}
        activeSemesterId={activeSemesterId}
        subjects={subjects}
        onSetActive={onSetActive}
        onEdit={handleOpenEdit}
        onArchive={(s) => setArchiveTarget(s)}
        onUnarchive={(s) => onUnarchiveSemester(s.id)}
        onDelete={(s) => setDeleteTarget(s)}
      />

      {/* Semester Form Modal */}
      <SemesterForm
        isOpen={formOpen}
        semesterToEdit={semesterToEdit}
        existingSemesters={semesters}
        onSave={handleFormSave}
        onClose={() => setFormOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Semester?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All subjects and attendance records associated with this semester will be permanently deleted.`}
        confirmLabel="Delete Semester"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(archiveTarget)}
        title="Archive Semester?"
        message={`Archive "${archiveTarget?.name}"? Its subjects and attendance history will be preserved and accessible in the archived tab, but will not be active.`}
        confirmLabel="Archive"
        cancelLabel="Cancel"
        isDestructive={false}
        onConfirm={confirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
};
