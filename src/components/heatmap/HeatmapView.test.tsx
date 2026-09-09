import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HeatmapView } from './HeatmapView';
import { MockStorage } from '../../test/mockStorage';
import { Semester } from '../../types/semester';

describe('HeatmapView Component', () => {
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

  it('renders heatmap view with live storage data', async () => {
    render(
      <HeatmapView
        semesters={semesters}
        activeSemester={semesters[0]!}
        subjects={[]}
        storage={storage}
        onNavigateToDailyEntry={vi.fn()}
      />
    );

    // Initial loading or view header
    expect(screen.getByText('Yearly Heatmap')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });
});
