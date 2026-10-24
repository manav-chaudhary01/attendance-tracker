import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SubjectForm } from './SubjectForm';

describe('SubjectForm Component', () => {
  it('renders fields and submits valid subject', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <SubjectForm
        isOpen={true}
        semesterId="sem-1"
        existingSubjectsInSemester={[]}
        onSave={handleSave}
        onClose={handleClose}
      />
    );

    const nameInput = screen.getByLabelText(/Subject Name/i);
    fireEvent.change(nameInput, { target: { value: 'Computer Architecture' } });

    const codeInput = screen.getByLabelText(/Code/i);
    fireEvent.change(codeInput, { target: { value: 'CS204' } });

    const submitBtn = screen.getByRole('button', { name: /Add Subject/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          semesterId: 'sem-1',
          name: 'Computer Architecture',
          subjectCode: 'CS204',
          attendanceTarget: 75,
        })
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('validates that classes attended cannot exceed classes held', async () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      <SubjectForm
        isOpen={true}
        semesterId="sem-1"
        existingSubjectsInSemester={[]}
        onSave={handleSave}
        onClose={handleClose}
      />
    );

    const nameInput = screen.getByLabelText(/Subject Name/i);
    fireEvent.change(nameInput, { target: { value: 'Chemistry' } });

    const heldInput = screen.getByLabelText(/^Classes Held$/i);
    const attendedInput = screen.getByLabelText(/^Classes Attended$/i);
    fireEvent.change(heldInput, { target: { value: '10' } });
    fireEvent.change(attendedInput, { target: { value: '15' } });

    const submitBtn = screen.getByRole('button', { name: /Add Subject/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/cannot exceed/i)).toBeInTheDocument();
    expect(handleSave).not.toHaveBeenCalled();
  });
});
