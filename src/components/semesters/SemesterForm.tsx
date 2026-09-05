import React, { useState, useEffect, useRef, useId } from 'react';
import { Semester, CreateSemesterInput } from '../../types/semester';
import { validateSemesterInput, SemesterValidationError } from '../../features/semesters/semesterService';
import { X } from 'lucide-react';

interface SemesterFormProps {
  isOpen: boolean;
  semesterToEdit?: Semester | null;
  existingSemesters: Semester[];
  onSave: (input: CreateSemesterInput, makeActive?: boolean) => Promise<void>;
  onClose: () => void;
}

export const SemesterForm: React.FC<SemesterFormProps> = ({
  isOpen,
  semesterToEdit,
  existingSemesters,
  onSave,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [makeActive, setMakeActive] = useState(true);
  const [errors, setErrors] = useState<SemesterValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (semesterToEdit) {
      setName(semesterToEdit.name);
      setAcademicYear(semesterToEdit.academicYear || '');
      setStartDate(semesterToEdit.startDate || '');
      setEndDate(semesterToEdit.endDate || '');
      setMakeActive(semesterToEdit.status === 'active');
    } else {
      setName('');
      setAcademicYear('');
      setStartDate('');
      setEndDate('');
      setMakeActive(true);
    }
    setErrors([]);
  }, [semesterToEdit, isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.open = true;
        }
      }
    } else {
      if (dialog.open) {
        if (typeof dialog.close === 'function') {
          dialog.close();
        } else {
          dialog.open = false;
        }
      }
    }
  }, [isOpen]);

  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog || e.target !== dialog) return;

    const rect = dialog.getBoundingClientRect();
    const isInside =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;

    if (!isInside) {
      onClose();
    }
  };

  const getFieldError = (field: 'name' | 'academicYear' | 'startDate' | 'endDate') => {
    return errors.find((e) => e.field === field)?.message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const input: CreateSemesterInput = {
      name: name.trim(),
      academicYear: academicYear.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: semesterToEdit?.status || 'active',
    };

    const validationErrors = validateSemesterInput(
      input,
      existingSemesters,
      semesterToEdit?.id
    );

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(input, makeActive);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save semester.';
      setErrors([{ message: msg }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClick={handleDialogClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto p-0 rounded-md bg-background border border-border shadow-md max-w-md w-[92%] backdrop:bg-charcoal/40 backdrop:backdrop-blur-sm outline-none"
    >
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 id={titleId} className="text-sm font-semibold text-charcoal">
            {semesterToEdit ? 'Edit Semester' : 'Create New Semester'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-charcoal-light hover:text-charcoal hover:bg-background-subtle"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* General Form Error */}
        {errors.some((e) => !e.field) && (
          <div role="alert" className="p-2.5 rounded bg-status-ineligibleBg text-status-ineligible text-xs">
            {errors.find((e) => !e.field)?.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="semester-name" className="block text-xs font-medium text-charcoal">
              Semester Name <span className="text-[#a83232]">*</span>
            </label>
            <input
              id="semester-name"
              type="text"
              required
              placeholder="e.g. Fall 2026 or Semester 5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(getFieldError('name'))}
              aria-describedby={getFieldError('name') ? 'semester-name-error' : undefined}
              className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded focus:border-accent text-charcoal outline-none"
            />
            {getFieldError('name') && (
              <span id="semester-name-error" role="alert" className="text-[11px] text-[#a83232] block">
                {getFieldError('name')}
              </span>
            )}
          </div>

          {/* Academic Year */}
          <div className="space-y-1">
            <label htmlFor="semester-year" className="block text-xs font-medium text-charcoal">
              Academic Year <span className="text-charcoal-light text-[10px] font-normal">(Optional)</span>
            </label>
            <input
              id="semester-year"
              type="text"
              placeholder="e.g. 2026-2027"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded focus:border-accent text-charcoal outline-none"
            />
          </div>

          {/* Start and End Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="semester-start" className="block text-xs font-medium text-charcoal">
                Start Date <span className="text-charcoal-light text-[10px] font-normal">(Optional)</span>
              </label>
              <input
                id="semester-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-invalid={Boolean(getFieldError('startDate'))}
                aria-describedby={getFieldError('startDate') ? 'semester-start-error' : undefined}
                className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded focus:border-accent text-charcoal outline-none"
              />
              {getFieldError('startDate') && (
                <span id="semester-start-error" role="alert" className="text-[11px] text-[#a83232] block">
                  {getFieldError('startDate')}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="semester-end" className="block text-xs font-medium text-charcoal">
                End Date <span className="text-charcoal-light text-[10px] font-normal">(Optional)</span>
              </label>
              <input
                id="semester-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-invalid={Boolean(getFieldError('endDate'))}
                aria-describedby={getFieldError('endDate') ? 'semester-end-error' : undefined}
                className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded focus:border-accent text-charcoal outline-none"
              />
              {getFieldError('endDate') && (
                <span id="semester-end-error" role="alert" className="text-[11px] text-[#a83232] block">
                  {getFieldError('endDate')}
                </span>
              )}
            </div>
          </div>

          {/* Set Active option (only when creating new) */}
          {!semesterToEdit && (
            <label className="flex items-center gap-2 pt-1 text-xs text-charcoal cursor-pointer select-none">
              <input
                type="checkbox"
                checked={makeActive}
                onChange={(e) => setMakeActive(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent accent-accent"
              />
              <span>Set as the active semester immediately</span>
            </label>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-charcoal-muted bg-background border border-border rounded hover:text-charcoal hover:bg-background-subtle transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : semesterToEdit ? 'Save Changes' : 'Create Semester'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};
