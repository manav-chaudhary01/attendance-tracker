import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttendanceStatus } from './AttendanceStatus';

describe('AttendanceStatus Component', () => {
  it('renders badge for eligible status', () => {
    render(<AttendanceStatus status="eligible" variant="badge" />);
    expect(screen.getByText('On Track')).toBeInTheDocument();
  });

  it('renders badge for at_risk status', () => {
    render(<AttendanceStatus status="at_risk" variant="badge" />);
    expect(screen.getByText('Needs Attention')).toBeInTheDocument();
  });

  it('renders badge for ineligible status', () => {
    render(<AttendanceStatus status="ineligible" variant="badge" />);
    expect(screen.getByText('Target Unachievable')).toBeInTheDocument();
  });

  it('renders callout variant with recovery information', () => {
    render(
      <AttendanceStatus
        status="at_risk"
        variant="callout"
        description="Below target by 3 classes."
        classesToRecover={4}
      />
    );

    const callout = screen.getByRole('status');
    expect(callout).toBeInTheDocument();
    expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    expect(screen.getByText('Below target by 3 classes.')).toBeInTheDocument();
    expect(screen.getByText(/Attend the next 4 consecutive classes/i)).toBeInTheDocument();
  });

  it('renders callout variant with safe bunks information', () => {
    render(
      <AttendanceStatus
        status="eligible"
        variant="callout"
        safeBunkCount={2}
      />
    );

    expect(screen.getByText(/You can skip 2 consecutive classes/i)).toBeInTheDocument();
  });
});
