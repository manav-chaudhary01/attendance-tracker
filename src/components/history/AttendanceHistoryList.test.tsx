import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AttendanceHistoryList } from './AttendanceHistoryList';
import { MockStorage } from '../../test/mockStorage';
import { Semester } from '../../types/semester';

describe('AttendanceHistoryList Component', () => {
  let storage: MockStorage;

  const semesters: Semester[] = [
    {
      id: 'sem-1',
      name: 'Fall 2026',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    storage = new MockStorage();

    await storage.saveSemester(semesters[0]!);

    await storage.saveSubject({
      id: 'sub-math',
      semesterId: 'sem-1',
      name: 'Mathematics',
      subjectCode: 'MATH101',
      attendanceTarget: 75,
      trackingMode: 'daily',
      totalClassesHeld: 4,
      totalClassesAttended: 3,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    await storage.saveSubject({
      id: 'sub-cs',
      semesterId: 'sem-1',
      name: 'Computer Science',
      subjectCode: 'CS102',
      attendanceTarget: 80,
      trackingMode: 'daily',
      totalClassesHeld: 2,
      totalClassesAttended: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    await storage.saveAttendanceRecord({
      id: 'rec-1',
      subjectId: 'sub-math',
      date: '2026-10-20',
      classesHeld: 2,
      classesAttended: 2,
      notes: 'Matrices review',
      createdAt: '2026-10-20T10:00:00Z',
      updatedAt: '2026-10-20T10:00:00Z',
    });

    await storage.saveAttendanceRecord({
      id: 'rec-2',
      subjectId: 'sub-cs',
      date: '2026-10-22',
      classesHeld: 2,
      classesAttended: 0,
      notes: 'Missed OS lecture',
      createdAt: '2026-10-22T10:00:00Z',
      updatedAt: '2026-10-22T10:00:00Z',
    });
  });

  it('renders history table with records and formatted information', async () => {
    render(
      <AttendanceHistoryList
        semesters={semesters}
        activeSemesterId="sem-1"
        storage={storage}
        onAttendanceChanged={vi.fn()}
      />
    );

    // Verify records appear
    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
      expect(screen.getByText('Computer Science')).toBeInTheDocument();
    });

    expect(screen.getByText('Matrices review')).toBeInTheDocument();
    expect(screen.getByText('Missed OS lecture')).toBeInTheDocument();
  });

  it('filters history records by search query', async () => {
    render(
      <AttendanceHistoryList
        semesters={semesters}
        activeSemesterId="sem-1"
        storage={storage}
        onAttendanceChanged={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText(/search records/i);
    fireEvent.change(searchInput, { target: { value: 'Matrices' } });

    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.queryByText('Computer Science')).not.toBeInTheDocument();
  });

  it('allows quick editing an attendance record and persists change', async () => {
    const handleChanged = vi.fn();

    render(
      <AttendanceHistoryList
        semesters={semesters}
        activeSemesterId="sem-1"
        storage={storage}
        onAttendanceChanged={handleChanged}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
    });

    // Click edit button for Math record
    const editButtons = screen.getAllByTitle('Edit record');
    fireEvent.click(editButtons[0]!);

    // Edit modal should be open
    expect(screen.getByText('Edit Attendance Record')).toBeInTheDocument();

    const attendedInput = screen.getByLabelText(/^Classes Attended$/i);
    fireEvent.change(attendedInput, { target: { value: '1' } });

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(handleChanged).toHaveBeenCalled();
    });
  });

  it('prompts confirmation and deletes an attendance record', async () => {
    const handleChanged = vi.fn();

    render(
      <AttendanceHistoryList
        semesters={semesters}
        activeSemesterId="sem-1"
        storage={storage}
        onAttendanceChanged={handleChanged}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Computer Science')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete record');
    fireEvent.click(deleteButtons[0]!);

    // Confirmation dialog should be open
    expect(screen.getByText('Delete Attendance Record')).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: /^Delete Record$/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(handleChanged).toHaveBeenCalled();
    });
  });
});
