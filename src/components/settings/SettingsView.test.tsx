import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsView } from './SettingsView';
import { MockStorage } from '../../test/mockStorage';

describe('SettingsView Component', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it('renders default target input and allows saving updated preferences', async () => {
    const handleDataChanged = vi.fn();

    render(<SettingsView storage={storage} onDataChanged={handleDataChanged} />);

    // Check header
    expect(screen.getByText('Settings & Data Management')).toBeInTheDocument();

    const targetInput = screen.getByLabelText(/default attendance target/i);
    expect(targetInput).toBeInTheDocument();

    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('75')).toBeInTheDocument();
    });

    // Click 80% preset
    const preset80 = screen.getByRole('button', { name: '80%' });
    fireEvent.click(preset80);

    const saveBtn = screen.getByRole('button', { name: /save preferences/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleDataChanged).toHaveBeenCalled();
    });

    const saved = await storage.getSettings();
    expect(saved.defaultAttendanceTarget).toBe(80);
  });

  it('provides export and import controls for local JSON backups', () => {
    render(<SettingsView storage={storage} onDataChanged={vi.fn()} />);

    expect(screen.getByRole('button', { name: /export json backup/i })).toBeInTheDocument();
    expect(screen.getByText(/import json backup/i)).toBeInTheDocument();
  });

  it('prompts confirmation when resetting all application data', async () => {
    const handleDataChanged = vi.fn();

    render(<SettingsView storage={storage} onDataChanged={handleDataChanged} />);

    const resetBtn = screen.getByRole('button', { name: /reset all local data/i });
    fireEvent.click(resetBtn);

    // Confirm dialog appears
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getAllByText('Reset All Local Data').length).toBeGreaterThan(0);

    const confirmBtn = screen.getByRole('button', { name: /^Yes, Erase All Data$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleDataChanged).toHaveBeenCalled();
    });
  });
});
