import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DailyAttendanceForm } from './DailyAttendanceForm';
import { MockStorage } from '../../test/mockStorage';
import { Subject } from '../../types/subject';
import { getTodayLocalDateString, addDays } from '../../utils/dates';

describe('DailyAttendanceForm Component', () => {
  let storage: MockStorage;
  const semesterId = 'sem-test';
  const today = getTodayLocalDateString();

  const subjects: Subject[] = [
    {
      id: 'sub-1',
      semesterId,
      name: 'Software Engineering',
      subjectCode: 'CS301',
      attendanceTarget: 75,
      trackingMode: 'daily',
      totalClassesHeld: 10,
      totalClassesAttended: 8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'sub-manual',
      semesterId,
      name: 'Independent Study',
      attendanceTarget: 75,
      trackingMode: 'manual',
      totalClassesHeld: 5,
      totalClassesAttended: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    storage = new MockStorage();
    storage.subjects = [...subjects];
  });

  it('renders today date by default and displays daily subjects', async () => {
    render(
      <DailyAttendanceForm
        semesterId={semesterId}
        semesterName="Fall 2026"
        subjects={subjects}
        storage={storage}
        onAttendanceSaved={vi.fn()}
      />
    );

    // Should display today's relative badge
    expect(await screen.findByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Software Engineering')).toBeInTheDocument();
    expect(screen.getByText('Manual Totals Subjects (1)')).toBeInTheDocument();
  });

  it('allows marking Present and saving daily attendance', async () => {
    const handleSaved = vi.fn().mockResolvedValue(undefined);

    render(
      <DailyAttendanceForm
        semesterId={semesterId}
        semesterName="Fall 2026"
        subjects={subjects}
        storage={storage}
        onAttendanceSaved={handleSaved}
      />
    );

    // Mark Present
    const presentBtn = await screen.findByRole('button', { name: /Present/i });
    fireEvent.click(presentBtn);

    // Save
    const saveBtn = screen.getByRole('button', { name: /Save Attendance/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleSaved).toHaveBeenCalled();
    });

    // Check storage record
    const record = await storage.getAttendanceRecordBySubjectAndDate('sub-1', today);
    expect(record).toBeDefined();
    expect(record?.classesHeld).toBe(1);
    expect(record?.classesAttended).toBe(1);
  });

  it('allows navigating to previous day and editing past attendance', async () => {
    const yesterday = addDays(today, -1);
    const handleSaved = vi.fn().mockResolvedValue(undefined);

    render(
      <DailyAttendanceForm
        semesterId={semesterId}
        semesterName="Fall 2026"
        subjects={subjects}
        storage={storage}
        onAttendanceSaved={handleSaved}
      />
    );

    // Click previous day
    const prevBtn = await screen.findByRole('button', { name: /Previous Day/i });
    fireEvent.click(prevBtn);

    // Yesterday badge should appear
    expect(await screen.findByText('Yesterday')).toBeInTheDocument();

    // Mark Absent
    const absentBtn = screen.getByRole('button', { name: /Absent/i });
    fireEvent.click(absentBtn);

    // Save
    const saveBtn = screen.getByRole('button', { name: /Save Attendance/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleSaved).toHaveBeenCalled();
    });

    const record = await storage.getAttendanceRecordBySubjectAndDate('sub-1', yesterday);
    expect(record).toBeDefined();
    expect(record?.classesHeld).toBe(1);
    expect(record?.classesAttended).toBe(0);
  });

  it('locks controls and displays warning for future dates', async () => {
    render(
      <DailyAttendanceForm
        semesterId={semesterId}
        semesterName="Fall 2026"
        subjects={subjects}
        storage={storage}
        onAttendanceSaved={vi.fn()}
      />
    );

    // Click next day (tomorrow)
    const nextBtn = await screen.findByRole('button', { name: /Next Day/i });
    fireEvent.click(nextBtn);

    expect(await screen.findByText(/Attendance logging is locked for future dates/i)).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /Save Attendance/i });
    expect(saveBtn).toBeDisabled();
  });
});
