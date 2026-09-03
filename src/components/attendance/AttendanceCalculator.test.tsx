import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttendanceCalculator } from './AttendanceCalculator';

describe('AttendanceCalculator Component', () => {
  it('calculates metrics dynamically based on inputs', () => {
    render(
      <AttendanceCalculator
        initialHeld={20}
        initialAttended={14}
        initialTarget={75}
      />
    );

    // Initial 14/20 = 70.0% (target 75%)
    // Below target -> Needs Attention
    expect(screen.getAllByText('Needs Attention').length).toBeGreaterThan(0);
    expect(screen.getAllByText('70.0%').length).toBeGreaterThan(0);
    expect(screen.getByText('4 consecutive')).toBeInTheDocument(); // Recovery needed
  });

  it('updates target via quick preset buttons', () => {
    render(
      <AttendanceCalculator
        initialHeld={20}
        initialAttended={16}
        initialTarget={75}
      />
    );

    const preset80 = screen.getByRole('button', { name: '80%' });
    fireEvent.click(preset80);

    const targetInput = screen.getByLabelText(/Target Percentage/i);
    expect(targetInput).toHaveValue(80);
  });

  it('validates user input and shows accessible inline error when attended > held', () => {
    render(
      <AttendanceCalculator
        initialHeld={10}
        initialAttended={15}
        initialTarget={75}
      />
    );

    const errorMsg = screen.getByRole('alert');
    expect(errorMsg).toHaveTextContent(/Classes attended cannot exceed total classes held/i);

    const heldInput = screen.getByLabelText(/Classes Held/i);
    expect(heldInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('validates target percentage range [0, 100]', () => {
    render(
      <AttendanceCalculator
        initialHeld={10}
        initialAttended={8}
        initialTarget={75}
      />
    );

    const targetInput = screen.getByLabelText(/Target Percentage/i);
    fireEvent.change(targetInput, { target: { value: '110' } });

    const errorMsg = screen.getByRole('alert');
    expect(errorMsg).toHaveTextContent(/Target must be between 0% and 100%/i);
  });

  it('calculates exam feasibility when remaining classes are entered', () => {
    render(
      <AttendanceCalculator
        initialHeld={20}
        initialAttended={12}
        initialTarget={75}
      />
    );

    const remainingInput = screen.getByLabelText(/Remaining Classes/i);
    fireEvent.change(remainingInput, { target: { value: '20' } });

    expect(screen.getByText(/Exam Feasibility \(20 classes remaining\)/i)).toBeInTheDocument();
    expect(screen.getByText(/You must attend at least 18 of 20 remaining classes/i)).toBeInTheDocument();
  });
});
