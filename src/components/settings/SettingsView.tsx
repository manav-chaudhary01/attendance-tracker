import React, { useState, useEffect, useRef } from 'react';
import { IStorage, AppSettings } from '../../types/storage';
import {
  validateBackupData,
  triggerBackupDownload,
  restoreBackupData,
  BackupValidationSummary,
} from '../../features/backup/backupService';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Save,
  FileCheck,
  X,
  Database,
  Percent,
} from 'lucide-react';

interface SettingsViewProps {
  storage: IStorage;
  onDataChanged: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ storage, onDataChanged }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [targetInput, setTargetInput] = useState<number>(75);
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(1);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);

  // Backup & Restore states
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [importSummary, setImportSummary] = useState<BackupValidationSummary | null>(null);
  const [importPendingData, setImportPendingData] = useState<any | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);

  // Clear data confirmation
  const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const s = await storage.getSettings();
        setSettings(s);
        setTargetInput(s.defaultAttendanceTarget || 75);
        setWeekStartsOn(s.weekStartsOn ?? 1);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
    loadSettings();
  }, [storage]);

  // Save general settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSavingSettings(true);
    setSettingsSuccessMsg(null);
    try {
      const updated: AppSettings = {
        ...settings,
        defaultAttendanceTarget: targetInput,
        weekStartsOn,
      };
      await storage.saveSettings(updated);
      setSettings(updated);
      setSettingsSuccessMsg('Preferences saved successfully.');
      await onDataChanged();
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Export JSON backup
  const handleExportBackup = async () => {
    setIsExporting(true);
    setBackupSuccessMsg(null);
    try {
      const backup = await storage.exportData();
      triggerBackupDownload(backup);
      setBackupSuccessMsg('Backup exported successfully.');
    } catch (err) {
      console.error('Failed to export backup:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file select for import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSummary(null);
    setImportPendingData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const validation = validateBackupData(parsed);

        if (!validation.isValid || !validation.data) {
          setImportError(validation.error || 'Invalid backup file.');
          return;
        }

        setImportPendingData(validation.data);
        setImportSummary(validation.summary!);
      } catch {
        setImportError('Failed to read file. Please ensure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);

    // Reset file input so user can pick the same file again if desired
    e.target.value = '';
  };

  // Confirm import and replace data atomically
  const handleConfirmImport = async () => {
    if (!importPendingData) return;

    try {
      await restoreBackupData(importPendingData, storage);
      setBackupSuccessMsg(
        `Successfully restored ${importSummary?.semesterCount} semester(s), ${importSummary?.subjectCount} subject(s), and ${importSummary?.recordCount} attendance record(s).`
      );
      setImportPendingData(null);
      setImportSummary(null);
      await onDataChanged();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to restore backup.');
    }
  };

  // Clear all data
  const handleConfirmClearAll = async () => {
    setIsClearing(true);
    try {
      await storage.clearAllData();
      setIsConfirmingClear(false);
      setBackupSuccessMsg('All application data and attendance records have been reset.');
      await onDataChanged();
    } catch (err) {
      console.error('Failed to clear data:', err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Settings &amp; Data Management</h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Configure local defaults, manage private data backups, and review storage status.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {settingsSuccessMsg && (
        <div
          role="status"
          className="flex items-center justify-between p-3 rounded bg-forest/10 border border-forest/20 text-forest text-xs motion-safe:animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{settingsSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSettingsSuccessMsg(null)}
            className="p-1 rounded hover:bg-forest/20"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {backupSuccessMsg && (
        <div
          role="status"
          className="flex items-center justify-between p-3 rounded bg-forest/10 border border-forest/20 text-forest text-xs motion-safe:animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{backupSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setBackupSuccessMsg(null)}
            className="p-1 rounded hover:bg-forest/20"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* General Preferences Card */}
      <div className="p-5 rounded bg-background border border-border shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Percent className="w-4 h-4 text-forest" />
          <h2 className="text-sm font-semibold text-charcoal">Attendance Targets &amp; Calendar Preferences</h2>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Default Attendance Target */}
            <div className="space-y-1.5">
              <label htmlFor="settings-default-target" className="block font-medium text-charcoal">
                Default Attendance Target (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="settings-default-target"
                  type="number"
                  min="0"
                  max="100"
                  value={targetInput}
                  onChange={(e) => setTargetInput(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-24 px-2.5 py-1.5 rounded border border-border bg-background text-charcoal font-mono text-xs focus-visible:ring-2 focus-visible:ring-forest outline-none"
                  required
                />
                <div className="flex items-center gap-1">
                  {[75, 80, 85].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetInput(preset)}
                      className={`px-2 py-1 text-[11px] rounded border ${
                        targetInput === preset
                          ? 'bg-charcoal text-white border-charcoal'
                          : 'bg-background-subtle border-border text-charcoal-muted hover:text-charcoal'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-charcoal-muted">
                Pre-populates the target percentage whenever you create a new course subject.
              </p>
            </div>

            {/* Week Starts On */}
            <div className="space-y-1.5">
              <label htmlFor="settings-week-start" className="block font-medium text-charcoal">
                Heatmap Week Starts On
              </label>
              <select
                id="settings-week-start"
                value={weekStartsOn}
                onChange={(e) => setWeekStartsOn(Number(e.target.value) as 0 | 1)}
                className="w-full sm:w-48 px-2.5 py-1.5 rounded border border-border bg-background text-charcoal text-xs focus-visible:ring-2 focus-visible:ring-forest outline-none"
              >
                <option value={1}>Monday (Standard University)</option>
                <option value={0}>Sunday</option>
              </select>
              <p className="text-[11px] text-charcoal-muted">
                Controls the weekday alignment for the yearly contribution heatmap.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-forest text-white rounded hover:bg-forest/90 focus-visible:ring-2 focus-visible:ring-forest outline-none shadow-2xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingSettings ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Local-First Backup & Recovery Card */}
      <div className="p-5 rounded bg-background border border-border shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-forest" />
            <h2 className="text-sm font-semibold text-charcoal">Backup &amp; Recovery</h2>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-forest/10 text-forest border border-forest/20">
            Schema v1
          </span>
        </div>

        <p className="text-xs text-charcoal-muted leading-relaxed">
          All your attendance records, subjects, and semesters are stored privately on your device in local
          IndexedDB. Export a JSON backup to keep safe copies or transfer your data across devices.
        </p>

        {importError && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs motion-safe:animate-fadeIn"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
            <span>{importError}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportBackup}
            disabled={isExporting}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-forest text-white rounded hover:bg-forest/90 focus-visible:ring-2 focus-visible:ring-forest outline-none shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export JSON Backup'}</span>
          </button>

          {/* Import File Button */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
              id="import-backup-file-input"
            />
            <label
              htmlFor="import-backup-file-input"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-charcoal bg-background border border-border rounded hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-forest outline-none cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-stone-500" />
              <span>Import JSON Backup</span>
            </label>
          </div>
        </div>
      </div>

      {/* Import Preview Confirmation Dialog */}
      {importSummary && (
        <div
          role="dialog"
          aria-labelledby="import-preview-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs motion-safe:animate-fadeIn"
        >
          <div className="bg-background border border-border rounded shadow-lg max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-forest" />
                <h3 id="import-preview-title" className="text-sm font-semibold text-charcoal">
                  Restore Backup Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImportSummary(null);
                  setImportPendingData(null);
                }}
                className="p-1 text-charcoal-muted hover:text-charcoal rounded"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p>
                <strong>Warning:</strong> Restoring this backup will replace your current local data.
                This operation is performed as an atomic local transaction.
              </p>
            </div>

            <div className="bg-background-subtle p-3 rounded border border-border text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-charcoal-muted">Exported:</span>
                <span className="font-mono text-charcoal">
                  {new Date(importSummary.exportedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-muted">Semesters:</span>
                <span className="font-semibold text-charcoal">{importSummary.semesterCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-muted">Subjects:</span>
                <span className="font-semibold text-charcoal">{importSummary.subjectCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-muted">Attendance Records:</span>
                <span className="font-semibold text-charcoal">{importSummary.recordCount}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setImportSummary(null);
                  setImportPendingData(null);
                }}
                className="px-3 py-1.5 text-xs text-charcoal-muted hover:text-charcoal border border-border rounded hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-forest outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-3 py-1.5 text-xs font-medium bg-forest text-white rounded hover:bg-forest/90 focus-visible:ring-2 focus-visible:ring-forest outline-none shadow-xs"
              >
                Confirm &amp; Restore Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone: Reset All Local Data */}
      <div className="p-5 rounded bg-background border border-amber-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-600" />
          <h2 className="text-sm font-semibold text-charcoal">Reset Application Data</h2>
        </div>
        <p className="text-xs text-charcoal-muted leading-relaxed">
          Erase all semesters, subjects, and attendance records from your browser's local storage. This action
          cannot be undone unless you have an exported JSON backup file.
        </p>
        <button
          type="button"
          onClick={() => setIsConfirmingClear(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-600 outline-none transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Reset All Local Data</span>
        </button>
      </div>

      {/* Confirm Clear All Dialog */}
      <ConfirmDialog
        isOpen={isConfirmingClear}
        title="Reset All Local Data"
        message="Are you completely sure you want to erase all semesters, subjects, and daily attendance history? This action is irreversible."
        confirmLabel={isClearing ? 'Erasing...' : 'Yes, Erase All Data'}
        isDestructive={true}
        onConfirm={handleConfirmClearAll}
        onCancel={() => setIsConfirmingClear(false)}
      />
    </div>
  );
};
