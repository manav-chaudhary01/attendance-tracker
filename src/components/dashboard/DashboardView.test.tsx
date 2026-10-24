import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardView } from './DashboardView';
import { MockStorage } from '../../test/mockStorage';
import { Semester } from '../../types/semester';
import { Subject } from '../../types/subject';

describe('DashboardView Component', () => {
  let storage: MockStorage;

  const activeSemester: Semester = {
    id: 'sem-fall-26',
    name: 'Fall 2026',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
  };

  const sampleSubjects: Subject[] = [
    // Below target (60% < 75%)
    {
      id: 'sub-1',
      semesterId: 'sem-fall-26',
      name: 'Advanced Algorithms',
      subjectCode: 'CS301',
      attendanceTarget: 75,
      trackingMode: 'daily',
      totalClassesHeld: 10,
      totalClassesAttended: 6,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    // Borderline (76% in [75%, 80%))
    {
      id: 'sub-2',
      semesterId: 'sem-fall-26',
      name: 'Discrete Math',
      subjectCode: 'MATH201',
      attendanceTarget: 75,
      trackingMode: 'daily',
      totalClassesHeld: 25,
      totalClassesAttended: 19, // 76.0%
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    // Comfortably above target (90% >= 80% + 5%)
    {
      id: 'sub-3',
      semesterId: 'sem-fall-26',
      name: 'Software Engineering',
      subjectCode: 'CS401',
      attendanceTarget: 80,
      trackingMode: 'daily',
      totalClassesHeld: 20,
      totalClassesAttended: 18, // 90.0%
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    storage = new MockStorage();
    await storage.saveSemester(activeSemester);
    for (const sub of sampleSubjects) {
      await storage.saveSubject(sub);
    }
  });

  it('renders welcome empty state when no active semester is selected', () => {
    const handleNavigate = vi.fn();

    render(
      <DashboardView
        onNavigate={handleNavigate}
        activeSemester={null}
        subjects={[]}
        storage={storage}
      />
    );

    expect(screen.getByText('No Active Semester Selected')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /configure semesters/i });
    fireEvent.click(btn);
    expect(handleNavigate).toHaveBeenCalledWith('semesters');
  });

  it('renders empty state when active semester has no subjects', () => {
    const handleNavigate = vi.fn();

    render(
      <DashboardView
        onNavigate={handleNavigate}
        activeSemester={activeSemester}
        subjects={[]}
        storage={storage}
      />
    );

    expect(screen.getByText(`No subjects added to "${activeSemester.name}"`)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /add first subject/i });
    fireEvent.click(btn);
    expect(handleNavigate).toHaveBeenCalledWith('subjects');
  });

  it('calculates weighted overall attendance percentage accurately across subjects', () => {
    render(
      <DashboardView
        onNavigate={vi.fn()}
        activeSemester={activeSemester}
        subjects={sampleSubjects}
        storage={storage}
      />
    );

    // Total held = 10 + 25 + 20 = 55
    // Total attended = 6 + 19 + 18 = 43
    // Overall % = (43 / 55) * 100 = 78.1818... -> 78.2%
    expect(screen.getAllByText('78.2%').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/43/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/55 classes/).length).toBeGreaterThan(0);
  });

  it('categorizes subjects into Below Target, Borderline, and Comfortably On Track tiers', () => {
    render(
      <DashboardView
        onNavigate={vi.fn()}
        activeSemester={activeSemester}
        subjects={sampleSubjects}
        storage={storage}
      />
    );

    // Below Target tier shows Advanced Algorithms
    expect(screen.getByText(/Below Target \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('Advanced Algorithms')).toBeInTheDocument();
    // Must attend next 6 classes consecutively to reach 75%
    expect(screen.getByText(/Must attend next/i)).toBeInTheDocument();

    // Borderline tier shows Discrete Math
    expect(screen.getByText(/Borderline \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('Discrete Math')).toBeInTheDocument();

    // Comfortably On Track tier shows Software Engineering
    expect(screen.getByText(/Comfortably On Track \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('Software Engineering')).toBeInTheDocument();
  });

  it('loads recent attendance activity from storage and displays it', async () => {
    // Add attendance record
    await storage.saveAttendanceRecord({
      id: 'rec-recent',
      subjectId: 'sub-1',
      date: '2026-10-24',
      classesHeld: 2,
      classesAttended: 2,
      notes: 'Graph theory quiz',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(
      <DashboardView
        onNavigate={vi.fn()}
        activeSemester={activeSemester}
        subjects={sampleSubjects}
        storage={storage}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Graph theory quiz')).toBeInTheDocument();
    });
  });

  it('navigates to daily attendance logging when clicking action buttons', () => {
    const handleNavigate = vi.fn();

    render(
      <DashboardView
        onNavigate={handleNavigate}
        activeSemester={activeSemester}
        subjects={sampleSubjects}
        storage={storage}
      />
    );

    const logButtons = screen.getAllByRole('button', { name: /log today's attendance/i });
    fireEvent.click(logButtons[0]!);
    expect(handleNavigate).toHaveBeenCalledWith('history');
  });

  it('toggles between Recovery Calculator and Safe Bunk Analyzer', () => {
    render(
      <DashboardView
        onNavigate={vi.fn()}
        activeSemester={activeSemester}
        subjects={sampleSubjects}
        storage={storage}
      />
    );

    const safeBunkTab = screen.getByRole('button', { name: /safe bunk analyzer/i });
    fireEvent.click(safeBunkTab);

    expect(screen.getByText(/Consecutive Safe Bunks:/i)).toBeInTheDocument();
  });
});
