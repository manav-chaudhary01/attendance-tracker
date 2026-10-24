import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HistoryView } from './HistoryView';
import { MockStorage } from '../../test/mockStorage';
import { Semester } from '../../types/semester';

describe('HistoryView Component', () => {
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
  });

  it('renders empty state when no active semester is selected in Daily Entry tab', () => {
    const handleNavigate = vi.fn();

    render(
      <HistoryView
        activeSemester={null}
        semesters={[]}
        subjects={[]}
        storage={storage}
        onAttendanceSaved={vi.fn()}
        onNavigate={handleNavigate}
      />
    );

    expect(screen.getByText('No Active Semester Selected')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /go to semesters/i });
    fireEvent.click(btn);
    expect(handleNavigate).toHaveBeenCalledWith('semesters');
  });

  it('switches between Daily Entry and Attendance Log tabs', async () => {
    render(
      <HistoryView
        activeSemester={semesters[0]!}
        semesters={semesters}
        subjects={[]}
        storage={storage}
        onAttendanceSaved={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    // Initial tab is Daily Entry
    expect(screen.getByRole('button', { name: /daily entry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /attendance log/i })).toBeInTheDocument();

    // Switch to Attendance Log
    const logTab = screen.getByRole('button', { name: /attendance log/i });
    fireEvent.click(logTab);

    await waitFor(() => {
      expect(screen.getByText(/filter attendance history/i)).toBeInTheDocument();
    });
  });
});
