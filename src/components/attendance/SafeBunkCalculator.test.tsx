import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SafeBunkCalculator } from './SafeBunkCalculator';

describe('SafeBunkCalculator Component', () => {
  it('renders safe bunks and generates projection table', () => {
    render(
      <SafeBunkCalculator
        initialHeld={24}
        initialAttended={21}
        initialTarget={75}
      />
    );

    // 21/24 = 87.5%, target 75%
    // 21 / 0.75 - 24 = 28 - 24 = 4 safe bunks
    expect(screen.getByText('4 classes')).toBeInTheDocument();
    expect(screen.getByText('Miss Impact Projection Table')).toBeInTheDocument();
    expect(screen.getByText('+1 class')).toBeInTheDocument();
    expect(screen.getByText('+2 classes')).toBeInTheDocument();
  });

  it('validates invalid inputs and displays errors', () => {
    render(
      <SafeBunkCalculator
        initialHeld={10}
        initialAttended={5}
        initialTarget={75}
      />
    );

    const heldInput = screen.getByLabelText(/Classes Held/i);
    fireEvent.change(heldInput, { target: { value: '-2' } });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/cannot be negative/i);
  });

  it('handles remaining classes for exam preparation safe bunks', () => {
    render(
      <SafeBunkCalculator
        initialHeld={20}
        initialAttended={18}
        initialTarget={75}
      />
    );

    const remainingInput = screen.getByLabelText(/Remaining Classes/i);
    fireEvent.change(remainingInput, { target: { value: '10' } });

    expect(
      screen.getByText(/Exam Preparation Safe Bunks \(10 classes remaining\)/i)
    ).toBeInTheDocument();
  });
});
