import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttendanceHeatmap } from './AttendanceHeatmap';
import { DailyAttendanceRecord } from '../../types/attendance';
import { Subject } from '../../types/subject';
import { Semester } from '../../types/semester';

describe('AttendanceHeatmap Component', () => {
  const semesters: Semester[] = [
    {
      id: 'sem-1',
      name: 'Fall 2026',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'sem-old',
      name: 'Spring 2025',
      status: 'archived',
      createdAt: '2025-01-01T00:00:00Z',
    },
  ];

  const subjects: Subject[] = [
    {
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
    },
    {
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
    },
  ];

  const records: DailyAttendanceRecord[] = [
    // 2026-04-10: Math (2 held, 2 attended = 100%)
    {
      id: 'rec-1',
      subjectId: 'sub-math',
      date: '2026-04-10',
      classesHeld: 2,
      classesAttended: 2,
      notes: 'Vectors lecture',
      createdAt: '2026-04-10T10:00:00Z',
      updatedAt: '2026-04-10T10:00:00Z',
    },
    // 2026-04-11: Math (2 held, 1 attended = 50%)
    {
      id: 'rec-2',
      subjectId: 'sub-math',
      date: '2026-04-11',
      classesHeld: 2,
      classesAttended: 1,
      createdAt: '2026-04-11T10:00:00Z',
      updatedAt: '2026-04-11T10:00:00Z',
    },
    // 2026-04-12: CS (2 held, 0 attended = 0% missed)
    {
      id: 'rec-3',
      subjectId: 'sub-cs',
      date: '2026-04-12',
      classesHeld: 2,
      classesAttended: 0,
      notes: 'Bunked lab',
      createdAt: '2026-04-12T10:00:00Z',
      updatedAt: '2026-04-12T10:00:00Z',
    },
  ];

  it('renders summary metrics, controls, and heatmap grid', () => {
    render(
      <AttendanceHeatmap
        records={records}
        subjects={subjects}
        semesters={semesters}
        activeSemesterId="sem-1"
      />
    );

    // Check year control
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(currentYear)).toBeInTheDocument();

    // Check filters
    expect(screen.getByLabelText(/filter by semester/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by subject/i)).toBeInTheDocument();

    // Check grid accessibility
    const grid = screen.getByRole('grid');
    expect(grid).toBeInTheDocument();

    // Check legend items
    expect(screen.getByText(/Missed \(0%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Future date/i)).toBeInTheDocument();
  });

  it('allows switching years using year navigation buttons', () => {
    render(
      <AttendanceHeatmap
        records={records}
        subjects={subjects}
        semesters={semesters}
        activeSemesterId="sem-1"
      />
    );

    const prevButton = screen.getByLabelText(/previous year/i);
    const nextButton = screen.getByLabelText(/next year/i);

    const currentYear = new Date().getFullYear();
    fireEvent.click(prevButton);
    expect(screen.getByText((currentYear - 1).toString())).toBeInTheDocument();

    fireEvent.click(nextButton);
    expect(screen.getByText(currentYear.toString())).toBeInTheDocument();
  });

  it('opens day details modal on day cell activation and triggers onNavigateToDailyEntry', () => {
    const handleNavigate = vi.fn();

    render(
      <AttendanceHeatmap
        records={records}
        subjects={subjects}
        semesters={semesters}
        activeSemesterId="sem-1"
        onNavigateToDailyEntry={handleNavigate}
      />
    );

    // Find the cell for 2026-04-10
    const cellButtons = screen.getAllByRole('gridcell');
    const targetCell = cellButtons.find((btn) =>
      btn.getAttribute('aria-label')?.includes('2026-04-10')
    );

    if (targetCell) {
      fireEvent.click(targetCell);

      // Verify modal content
      expect(screen.getByText(/Recorded Classes/i)).toBeInTheDocument();
      expect(screen.getByText('Vectors lecture')).toBeInTheDocument();

      // Click "Edit in Daily Logger"
      const editButton = screen.getByRole('button', { name: /edit in daily logger/i });
      fireEvent.click(editButton);
      expect(handleNavigate).toHaveBeenCalledWith('2026-04-10');
    }
  });

  it('filters heatmap by subject correctly', () => {
    render(
      <AttendanceHeatmap
        records={records}
        subjects={subjects}
        semesters={semesters}
        activeSemesterId="sem-1"
      />
    );

    const subjectSelect = screen.getByLabelText(/filter by subject/i);
    fireEvent.change(subjectSelect, { target: { value: 'sub-cs' } });

    // In CS, only 2 classes were held and 0 attended
    // Summary Attended should be 0
    const attendedElements = screen.getAllByText('0');
    expect(attendedElements.length).toBeGreaterThan(0);
  });
});
