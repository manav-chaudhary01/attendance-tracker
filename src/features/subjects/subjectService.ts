import { Subject, CreateSubjectInput, UpdateSubjectInput } from '../../types/subject';
import { IStorage } from '../../types/storage';
import { validateTarget, validateCounts } from '../attendance/calculations';

export interface SubjectValidationError {
  field?: 'name' | 'subjectCode' | 'attendanceTarget' | 'totalClassesHeld' | 'totalClassesAttended' | 'semesterId';
  message: string;
}

export function validateSubjectInput(
  input: Partial<CreateSubjectInput>,
  existingInSemester: Subject[] = [],
  currentId?: string
): SubjectValidationError[] {
  const errors: SubjectValidationError[] = [];

  // Validate semesterId
  if (!input.semesterId) {
    errors.push({ field: 'semesterId', message: 'Subject must be assigned to a semester.' });
  }

  // Validate Name
  const trimmedName = input.name?.trim() ?? '';
  if (!trimmedName) {
    errors.push({ field: 'name', message: 'Subject name is required.' });
  } else if (trimmedName.length > 100) {
    errors.push({ field: 'name', message: 'Subject name must not exceed 100 characters.' });
  } else {
    // Unique check within this semester
    const duplicate = existingInSemester.find(
      (s) => s.id !== currentId && s.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      errors.push({
        field: 'name',
        message: `A subject named "${duplicate.name}" already exists in this semester.`,
      });
    }
  }

  // Validate Subject Code (optional)
  const trimmedCode = input.subjectCode?.trim() ?? '';
  if (trimmedCode) {
    if (trimmedCode.length > 30) {
      errors.push({ field: 'subjectCode', message: 'Subject code must not exceed 30 characters.' });
    } else {
      const duplicateCode = existingInSemester.find(
        (s) =>
          s.id !== currentId &&
          s.subjectCode &&
          s.subjectCode.trim().toLowerCase() === trimmedCode.toLowerCase()
      );
      if (duplicateCode) {
        errors.push({
          field: 'subjectCode',
          message: `Subject code "${duplicateCode.subjectCode}" is already in use in this semester.`,
        });
      }
    }
  }

  // Validate Attendance Target
  if (input.attendanceTarget === undefined || input.attendanceTarget === null) {
    errors.push({ field: 'attendanceTarget', message: 'Attendance target is required.' });
  } else {
    try {
      validateTarget(input.attendanceTarget);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid attendance target';
      errors.push({ field: 'attendanceTarget', message: msg });
    }
  }

  // Validate Counts
  const held = input.totalClassesHeld ?? 0;
  const attended = input.totalClassesAttended ?? 0;
  try {
    validateCounts(held, attended);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid class counts';
    if (attended > held) {
      errors.push({ field: 'totalClassesAttended', message: msg });
    } else {
      errors.push({ field: 'totalClassesHeld', message: msg });
    }
  }

  return errors;
}

export async function createSubject(
  input: CreateSubjectInput,
  storage: IStorage
): Promise<Subject> {
  const existingInSemester = await storage.getSubjects(input.semesterId);
  const errors = validateSubjectInput(input, existingInSemester);
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join(' '));
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const subject: Subject = {
    id,
    semesterId: input.semesterId,
    name: input.name.trim(),
    subjectCode: input.subjectCode?.trim() || undefined,
    attendanceTarget: Number(input.attendanceTarget),
    trackingMode: input.trackingMode || 'daily',
    totalClassesHeld: Number(input.totalClassesHeld || 0),
    totalClassesAttended: Number(input.totalClassesAttended || 0),
    createdAt: now,
    updatedAt: now,
  };

  await storage.saveSubject(subject);
  return subject;
}

export async function updateSubject(
  id: string,
  updates: UpdateSubjectInput,
  storage: IStorage
): Promise<Subject> {
  const existing = await storage.getSubject(id);
  if (!existing) {
    throw new Error(`Subject with id "${id}" not found.`);
  }

  const existingInSemester = await storage.getSubjects(existing.semesterId);
  const merged: CreateSubjectInput = {
    semesterId: existing.semesterId,
    name: updates.name !== undefined ? updates.name : existing.name,
    subjectCode: updates.subjectCode !== undefined ? updates.subjectCode : existing.subjectCode,
    attendanceTarget:
      updates.attendanceTarget !== undefined ? updates.attendanceTarget : existing.attendanceTarget,
    trackingMode: updates.trackingMode !== undefined ? updates.trackingMode : existing.trackingMode,
    totalClassesHeld:
      updates.totalClassesHeld !== undefined ? updates.totalClassesHeld : existing.totalClassesHeld,
    totalClassesAttended:
      updates.totalClassesAttended !== undefined
        ? updates.totalClassesAttended
        : existing.totalClassesAttended,
  };

  const errors = validateSubjectInput(merged, existingInSemester, id);
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join(' '));
  }

  const updated: Subject = {
    ...existing,
    name: merged.name.trim(),
    subjectCode: merged.subjectCode?.trim() || undefined,
    attendanceTarget: Number(merged.attendanceTarget),
    trackingMode: merged.trackingMode,
    totalClassesHeld: Number(merged.totalClassesHeld),
    totalClassesAttended: Number(merged.totalClassesAttended),
    updatedAt: new Date().toISOString(),
  };

  await storage.saveSubject(updated);
  return updated;
}

export async function deleteSubject(id: string, storage: IStorage): Promise<void> {
  await storage.deleteSubject(id);
}
