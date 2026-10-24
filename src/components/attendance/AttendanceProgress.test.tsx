import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttendanceProgress } from './AttendanceProgress';

describe('AttendanceProgress Component', () => {
  it('renders progressbar with accessible attributes and label', () => {
    render(
      <AttendanceProgress
        classesHeld={20}
        classesAttended={16}
        targetPercentage={75}
      />
    );

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '80');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-valuetext');

    expect(screen.getByText('16 / 20 classes')).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument();
    expect(screen.getByText('(target 75%)')).toBeInTheDocument();
  });

  it('renders unstarted state correctly when 0 classes held', () => {
    render(
      <AttendanceProgress
        classesHeld={0}
        classesAttended={0}
        targetPercentage={75}
      />
    );

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    expect(progressbar).toHaveAttribute('aria-valuetext', 'No classes held yet');
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders target marker when target is between 1% and 99%', () => {
    const { container } = render(
      <AttendanceProgress
        classesHeld={20}
        classesAttended={16}
        targetPercentage={75}
      />
    );

    const marker = container.querySelector('[title="Target: 75%"]');
    expect(marker).toBeInTheDocument();
  });
});
