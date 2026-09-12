import React, { useState, useEffect, useRef, useId } from 'react';
import { Subject, CreateSubjectInput, TrackingMode } from '../../types/subject';
import { validateSubjectInput, SubjectValidationError } from '../../features/subjects/subjectService';
import { X } from 'lucide-react';

interface SubjectFormProps {
  isOpen: boolean;
  semesterId: string;
  subjectToEdit?: Subject | null;
  existingSubjectsInSemester: Subject[];
  defaultTarget?: number;
  onSave: (input: CreateSubjectInput) => Promise<void>;
  onClose: () => void;
}

export const SubjectForm: React.FC<SubjectFormProps> = ({
  isOpen,
  semesterId,
  subjectToEdit,
  existingSubjectsInSemester,
  defaultTarget = 75,
  onSave,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const [name, setName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [target, setTarget] = useState(String(defaultTarget));
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('daily');
  const [held, setHeld] = useState('0');
  const [attended, setAttended] = useState('0');
  const [errors, setErrors] = useState<SubjectValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (subjectToEdit) {
      setName(subjectToEdit.name);
      setSubjectCode(subjectToEdit.subjectCode || '');
      setTarget(String(subjectToEdit.attendanceTarget));
      setTrackingMode(subjectToEdit.trackingMode);
      setHeld(String(subjectToEdit.totalClassesHeld));
      setAttended(String(subjectToEdit.totalClassesAttended));
    } else {
      setName('');
      setSubjectCode('');
      setTarget(String(defaultTarget));
      setTrackingMode('daily');
      setHeld('0');
      setAttended('0');
    }
    setErrors([]);
  }, [subjectToEdit, isOpen, defaultTarget]);

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

  const getFieldError = (field: SubjectValidationError['field']) => {
    return errors.find((e) => e.field === field)?.message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const heldNum = Number(held);
    const attendedNum = Number(attended);
    const targetNum = Number(target);

    const input: CreateSubjectInput = {
      semesterId,
      name: name.trim(),
      subjectCode: subjectCode.trim() || undefined,
      attendanceTarget: targetNum,
      trackingMode,
      totalClassesHeld: isNaN(heldNum) ? 0 : heldNum,
      totalClassesAttended: isNaN(attendedNum) ? 0 : attendedNum,
    };

    const validationErrors = validateSubjectInput(
      input,
      existingSubjectsInSemester,
      subjectToEdit?.id
    );

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(input);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save subject.';
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
      className="m-auto p-0 rounded-lg bg-white border border-border shadow-xl max-w-md w-[92%] backdrop:bg-charcoal/40 backdrop:backdrop-blur-sm outline-none animate-scale-in"
    >
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 id={titleId} className="text-sm font-semibold text-charcoal">
            {subjectToEdit ? 'Edit Subject' : 'Add New Subject'}
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
          {/* Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label htmlFor="subject-name" className="block text-xs font-medium text-charcoal">
                Subject Name <span className="text-[#a83232]">*</span>
              </label>
              <input
                id="subject-name"
                type="text"
                required
                placeholder="e.g. Data Structures"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={Boolean(getFieldError('name'))}
                aria-describedby={getFieldError('name') ? 'subject-name-error' : undefined}
                className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded focus:border-accent text-charcoal outline-none"
              />
              {getFieldError('name') && (
                <span id="subject-name-error" role="alert" className="text-[11px] text-[#a83232] block">
                  {getFieldError('name')}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="subject-code" className="block text-xs font-medium text-charcoal">
                Code <span className="text-charcoal-light text-[10px] font-normal">(Opt)</span>
              </label>
              <input
                id="subject-code"
                type="text"
                placeholder="CS201"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                aria-invalid={Boolean(getFieldError('subjectCode'))}
                aria-describedby={getFieldError('subjectCode') ? 'subject-code-error' : undefined}
                className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded focus:border-accent text-charcoal outline-none uppercase"
              />
              {getFieldError('subjectCode') && (
                <span id="subject-code-error" role="alert" className="text-[11px] text-[#a83232] block">
                  {getFieldError('subjectCode')}
                </span>
              )}
            </div>
          </div>

          {/* Attendance Target */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="subject-target" className="block text-xs font-medium text-charcoal">
                Attendance Target (%) <span className="text-[#a83232]">*</span>
              </label>
              <div className="flex gap-1">
                {[65, 75, 80, 85].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTarget(String(preset))}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                      target === String(preset)
                        ? 'border-accent bg-accent-light text-accent font-semibold'
                        : 'border-border text-charcoal-light hover:text-charcoal'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
            <input
              id="subject-target"
              type="number"
              min="0"
              max="100"
              step="any"
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-invalid={Boolean(getFieldError('attendanceTarget'))}
              aria-describedby={getFieldError('attendanceTarget') ? 'subject-target-error' : undefined}
              className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded focus:border-accent text-charcoal tabular-nums outline-none"
            />
            {getFieldError('attendanceTarget') && (
              <span id="subject-target-error" role="alert" className="text-[11px] text-[#a83232] block">
                {getFieldError('attendanceTarget')}
              </span>
            )}
          </div>

          {/* Tracking Mode */}
          <div className="space-y-1.5 pt-1 border-t border-border/60">
            <span className="block text-xs font-medium text-charcoal">Tracking Method</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label
                className={`p-2.5 border rounded cursor-pointer transition-colors ${
                  trackingMode === 'daily'
                    ? 'border-accent bg-accent-light/10 text-charcoal font-medium'
                    : 'border-border text-charcoal-muted hover:bg-background-subtle'
                }`}
              >
                <input
                  type="radio"
                  name="trackingMode"
                  value="daily"
                  checked={trackingMode === 'daily'}
                  onChange={() => setTrackingMode('daily')}
                  className="sr-only"
                />
                <span className="block font-semibold">Daily Attendance</span>
                <span className="text-[10px] text-charcoal-light block mt-0.5">
                  Record daily classes held &amp; attended
                </span>
              </label>

              <label
                className={`p-2.5 border rounded cursor-pointer transition-colors ${
                  trackingMode === 'manual'
                    ? 'border-accent bg-accent-light/10 text-charcoal font-medium'
                    : 'border-border text-charcoal-muted hover:bg-background-subtle'
                }`}
              >
                <input
                  type="radio"
                  name="trackingMode"
                  value="manual"
                  checked={trackingMode === 'manual'}
                  onChange={() => setTrackingMode('manual')}
                  className="sr-only"
                />
                <span className="block font-semibold">Manual Totals</span>
                <span className="text-[10px] text-charcoal-light block mt-0.5">
                  Directly enter overall total counts
                </span>
              </label>
            </div>
          </div>

          {/* Manual Totals / Initial Class Counts */}
          <div className="p-3 bg-background-subtle border border-border rounded space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-charcoal">
                {trackingMode === 'manual' ? 'Subject Class Counts' : 'Starting Class Totals'}
              </span>
              <span className="text-[10px] text-charcoal-light">
                {trackingMode === 'daily' ? 'Optional (if starting mid-term)' : 'Direct editable totals'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="classes-held" className="block text-[11px] text-charcoal-muted">
                  Classes Held
                </label>
                <input
                  id="classes-held"
                  type="number"
                  min="0"
                  step="1"
                  value={held}
                  onChange={(e) => setHeld(e.target.value)}
                  aria-invalid={Boolean(getFieldError('totalClassesHeld'))}
                  aria-describedby={getFieldError('totalClassesHeld') ? 'held-error' : undefined}
                  className="w-full px-2 py-1 text-xs bg-background border border-border rounded focus:border-accent text-charcoal tabular-nums outline-none"
                />
                {getFieldError('totalClassesHeld') && (
                  <span id="held-error" role="alert" className="text-[10px] text-[#a83232] block">
                    {getFieldError('totalClassesHeld')}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="classes-attended" className="block text-[11px] text-charcoal-muted">
                  Classes Attended
                </label>
                <input
                  id="classes-attended"
                  type="number"
                  min="0"
                  step="1"
                  value={attended}
                  onChange={(e) => setAttended(e.target.value)}
                  aria-invalid={Boolean(getFieldError('totalClassesAttended'))}
                  aria-describedby={getFieldError('totalClassesAttended') ? 'attended-error' : undefined}
                  className="w-full px-2 py-1 text-xs bg-background border border-border rounded focus:border-accent text-charcoal tabular-nums outline-none"
                />
                {getFieldError('totalClassesAttended') && (
                  <span id="attended-error" role="alert" className="text-[10px] text-[#a83232] block">
                    {getFieldError('totalClassesAttended')}
                  </span>
                )}
              </div>
            </div>
          </div>

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
              {isSubmitting ? 'Saving...' : subjectToEdit ? 'Save Changes' : 'Add Subject'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};
