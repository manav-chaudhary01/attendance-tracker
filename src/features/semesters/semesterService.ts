import { Semester, CreateSemesterInput, UpdateSemesterInput } from '../../types/semester';
import { IStorage } from '../../types/storage';

export interface SemesterValidationError {
  field?: 'name' | 'academicYear' | 'startDate' | 'endDate';
  message: string;
}

export function validateSemesterInput(
  input: Partial<CreateSemesterInput>,
  existingSemesters: Semester[] = [],
  currentId?: string
): SemesterValidationError[] {
  const errors: SemesterValidationError[] = [];

  // Validate Name
  const trimmedName = input.name?.trim() ?? '';
  if (!trimmedName) {
    errors.push({ field: 'name', message: 'Semester name is required.' });
  } else if (trimmedName.length > 100) {
    errors.push({ field: 'name', message: 'Semester name must not exceed 100 characters.' });
  } else {
    // Check for duplicate name (case-insensitive)
    const duplicate = existingSemesters.find(
      (s) => s.id !== currentId && s.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      errors.push({
        field: 'name',
        message: `A semester named "${duplicate.name}" already exists.`,
      });
    }
  }

  // Validate Academic Year (optional)
  if (input.academicYear && input.academicYear.trim().length > 50) {
    errors.push({ field: 'academicYear', message: 'Academic year must not exceed 50 characters.' });
  }

  // Validate Dates (optional)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (input.startDate && !dateRegex.test(input.startDate)) {
    errors.push({ field: 'startDate', message: 'Start date must be in YYYY-MM-DD format.' });
  }
  if (input.endDate && !dateRegex.test(input.endDate)) {
    errors.push({ field: 'endDate', message: 'End date must be in YYYY-MM-DD format.' });
  }

  if (input.startDate && input.endDate && dateRegex.test(input.startDate) && dateRegex.test(input.endDate)) {
    if (input.startDate > input.endDate) {
      errors.push({ field: 'endDate', message: 'End date cannot be earlier than start date.' });
    }
  }

  return errors;
}

export async function createSemester(
  input: CreateSemesterInput,
  storage: IStorage,
  options: { makeActive?: boolean } = {}
): Promise<Semester> {
  const existing = await storage.getSemesters();
  const errors = validateSemesterInput(input, existing);
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join(' '));
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const semester: Semester = {
    id,
    name: input.name.trim(),
    academicYear: input.academicYear?.trim() || undefined,
    startDate: input.startDate || undefined,
    endDate: input.endDate || undefined,
    status: input.status || 'active',
    createdAt: now,
  };

  await storage.saveSemester(semester);

  // If makeActive is requested OR if this is the first active semester, activate it
  const settings = await storage.getSettings();
  const shouldMakeActive =
    options.makeActive ||
    !settings.activeSemesterId ||
    existing.length === 0;

  if (shouldMakeActive && semester.status === 'active') {
    await storage.saveSettings({
      ...settings,
      activeSemesterId: semester.id,
    });
  }

  return semester;
}

export async function updateSemester(
  id: string,
  updates: UpdateSemesterInput,
  storage: IStorage
): Promise<Semester> {
  const existing = await storage.getSemester(id);
  if (!existing) {
    throw new Error(`Semester with id "${id}" not found.`);
  }

  const allSemesters = await storage.getSemesters();
  const merged: CreateSemesterInput = {
    name: updates.name !== undefined ? updates.name : existing.name,
    academicYear: updates.academicYear !== undefined ? updates.academicYear : existing.academicYear,
    startDate: updates.startDate !== undefined ? updates.startDate : existing.startDate,
    endDate: updates.endDate !== undefined ? updates.endDate : existing.endDate,
    status: updates.status !== undefined ? updates.status : existing.status,
  };

  const errors = validateSemesterInput(merged, allSemesters, id);
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join(' '));
  }

  const updated: Semester = {
    ...existing,
    name: merged.name.trim(),
    academicYear: merged.academicYear?.trim() || undefined,
    startDate: merged.startDate || undefined,
    endDate: merged.endDate || undefined,
    status: merged.status,
    archivedAt:
      merged.status === 'archived' && existing.status !== 'archived'
        ? new Date().toISOString()
        : merged.status === 'active'
        ? undefined
        : existing.archivedAt,
  };

  await storage.saveSemester(updated);
  return updated;
}

export async function archiveSemester(id: string, storage: IStorage): Promise<Semester> {
  const semester = await storage.getSemester(id);
  if (!semester) {
    throw new Error(`Semester with id "${id}" not found.`);
  }

  const archived: Semester = {
    ...semester,
    status: 'archived',
    archivedAt: new Date().toISOString(),
  };

  await storage.saveSemester(archived);

  // If this was the active semester, switch activeSemesterId to another active semester or null
  const settings = await storage.getSettings();
  if (settings.activeSemesterId === id) {
    const all = await storage.getSemesters();
    const otherActive = all.find((s) => s.id !== id && s.status === 'active');
    await storage.saveSettings({
      ...settings,
      activeSemesterId: otherActive ? otherActive.id : null,
    });
  }

  return archived;
}

export async function unarchiveSemester(
  id: string,
  storage: IStorage,
  makeActive = true
): Promise<Semester> {
  const semester = await storage.getSemester(id);
  if (!semester) {
    throw new Error(`Semester with id "${id}" not found.`);
  }

  const restored: Semester = {
    ...semester,
    status: 'active',
    archivedAt: undefined,
  };

  await storage.saveSemester(restored);

  if (makeActive) {
    const settings = await storage.getSettings();
    await storage.saveSettings({
      ...settings,
      activeSemesterId: restored.id,
    });
  }

  return restored;
}

export async function deleteSemester(id: string, storage: IStorage): Promise<void> {
  await storage.deleteSemester(id);

  const settings = await storage.getSettings();
  if (settings.activeSemesterId === id) {
    const all = await storage.getSemesters();
    const remainingActive = all.find((s) => s.status === 'active');
    await storage.saveSettings({
      ...settings,
      activeSemesterId: remainingActive ? remainingActive.id : null,
    });
  }
}

export async function setActiveSemester(id: string, storage: IStorage): Promise<void> {
  const semester = await storage.getSemester(id);
  if (!semester) {
    throw new Error(`Semester with id "${id}" not found.`);
  }

  const settings = await storage.getSettings();
  await storage.saveSettings({
    ...settings,
    activeSemesterId: id,
  });
}
