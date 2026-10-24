import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SemesterForm } from './SemesterForm';

describe('SemesterForm Component', () => {
  it('renders fields and handles valid submission', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <SemesterForm
        isOpen={true}
        existingSemesters={[]}
        onSave={handleSave}
        onClose={handleClose}
      />
    );

    const nameInput = screen.getByLabelText(/Semester Name/i);
    fireEvent.change(nameInput, { target: { value: 'Fall 2026' } });

    const submitBtn = screen.getByRole('button', { name: /Create Semester/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fall 2026',
          status: 'active',
        }),
        true
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('shows error when start date is after end date', async () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      <SemesterForm
        isOpen={true}
        existingSemesters={[]}
        onSave={handleSave}
        onClose={handleClose}
      />
    );

    const nameInput = screen.getByLabelText(/Semester Name/i);
    fireEvent.change(nameInput, { target: { value: 'Spring 2027' } });

    const startInput = screen.getByLabelText(/Start Date/i);
    const endInput = screen.getByLabelText(/End Date/i);
    fireEvent.change(startInput, { target: { value: '2027-06-01' } });
    fireEvent.change(endInput, { target: { value: '2027-01-01' } });

    const submitBtn = screen.getByRole('button', { name: /Create Semester/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/End date cannot be earlier than start date/i)).toBeInTheDocument();
    expect(handleSave).not.toHaveBeenCalled();
  });
});
