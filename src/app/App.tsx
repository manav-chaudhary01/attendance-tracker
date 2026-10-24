import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from './router';
import { AppLayout } from '../components/layout/AppLayout';
import { DashboardView } from '../components/dashboard/DashboardView';
import { SubjectsView } from '../components/subjects/SubjectsView';
import { HistoryView } from '../components/history/HistoryView';
import { HeatmapView } from '../components/heatmap/HeatmapView';
import { SemestersView } from '../components/semesters/SemestersView';
import { SettingsView } from '../components/settings/SettingsView';
import { storage } from '../db/database';
import { Semester, CreateSemesterInput, UpdateSemesterInput } from '../types/semester';
import { Subject, CreateSubjectInput, UpdateSubjectInput } from '../types/subject';
import {
  createSemester,
  updateSemester,
  archiveSemester,
  unarchiveSemester,
  deleteSemester,
  setActiveSemester,
} from '../features/semesters/semesterService';
import {
  createSubject,
  updateSubject,
  deleteSubject,
} from '../features/subjects/subjectService';

export const App: React.FC = () => {
  const { currentRoute, navigate } = useRouter();

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [activeSemester, setActiveSemesterState] = useState<Semester | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [defaultTarget, setDefaultTarget] = useState<number>(75);
  const [isInitializing, setIsInitializing] = useState(true);

  // Load all app data from local IndexedDB
  const refreshData = useCallback(async () => {
    try {
      const [allSemesters, settings, allStoredSubjects] = await Promise.all([
        storage.getSemesters(),
        storage.getSettings(),
        storage.getSubjects(),
      ]);

      setSemesters(allSemesters);
      setAllSubjects(allStoredSubjects);
      setDefaultTarget(settings.defaultAttendanceTarget || 75);

      // Resolve active semester
      let active = allSemesters.find(
        (s) => s.id === settings.activeSemesterId && s.status === 'active'
      );

      // If active semester in settings is missing or archived, auto-elect first active semester
      if (!active) {
        const firstActive = allSemesters.find((s) => s.status === 'active');
        if (firstActive) {
          active = firstActive;
          await storage.saveSettings({
            ...settings,
            activeSemesterId: firstActive.id,
          });
        } else {
          active = undefined;
        }
      }

      setActiveSemesterState(active ?? null);

      // Load subjects scoped strictly to the active semester
      if (active) {
        const semesterSubjects = allStoredSubjects.filter((sub) => sub.semesterId === active.id);
        setSubjects(semesterSubjects);
      } else {
        setSubjects([]);
      }
    } catch (err) {
      console.error('Failed to load data from storage:', err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      await refreshData();
      setIsInitializing(false);
    }
    init();
  }, [refreshData]);

  // Semester Operations
  const handleSetActiveSemester = async (id: string) => {
    await setActiveSemester(id, storage);
    await refreshData();
  };

  const handleCreateSemester = async (input: CreateSemesterInput, makeActive = true) => {
    await createSemester(input, storage, { makeActive });
    await refreshData();
  };

  const handleUpdateSemester = async (id: string, input: UpdateSemesterInput) => {
    await updateSemester(id, input, storage);
    await refreshData();
  };

  const handleArchiveSemester = async (id: string) => {
    await archiveSemester(id, storage);
    await refreshData();
  };

  const handleUnarchiveSemester = async (id: string) => {
    await unarchiveSemester(id, storage, true);
    await refreshData();
  };

  const handleDeleteSemester = async (id: string) => {
    await deleteSemester(id, storage);
    await refreshData();
  };

  // Subject Operations
  const handleCreateSubject = async (input: CreateSubjectInput) => {
    await createSubject(input, storage);
    await refreshData();
  };

  const handleUpdateSubject = async (id: string, input: UpdateSubjectInput) => {
    await updateSubject(id, input, storage);
    await refreshData();
  };

  const handleDeleteSubject = async (id: string) => {
    await deleteSubject(id, storage);
    await refreshData();
  };

  const renderCurrentView = () => {
    switch (currentRoute) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigate={navigate}
            activeSemester={activeSemester}
            subjects={subjects}
          />
        );
      case 'subjects':
        return (
          <SubjectsView
            activeSemester={activeSemester}
            subjects={subjects}
            defaultAttendanceTarget={defaultTarget}
            onNavigate={navigate}
            onCreateSubject={handleCreateSubject}
            onUpdateSubject={handleUpdateSubject}
            onDeleteSubject={handleDeleteSubject}
          />
        );
      case 'history':
        return (
          <HistoryView
            activeSemester={activeSemester}
            subjects={subjects}
            storage={storage}
            onAttendanceSaved={refreshData}
            onNavigate={navigate}
          />
        );
      case 'heatmap':
        return <HeatmapView />;
      case 'semesters':
        return (
          <SemestersView
            semesters={semesters}
            activeSemesterName={activeSemester?.name ?? null}
            activeSemesterId={activeSemester?.id ?? null}
            subjects={allSubjects}
            onSetActive={handleSetActiveSemester}
            onCreateSemester={handleCreateSemester}
            onUpdateSemester={handleUpdateSemester}
            onArchiveSemester={handleArchiveSemester}
            onUnarchiveSemester={handleUnarchiveSemester}
            onDeleteSemester={handleDeleteSemester}
          />
        );
      case 'settings':
        return <SettingsView />;
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs text-charcoal-muted animate-pulse">
          Loading attendance data...
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      currentRoute={currentRoute}
      onNavigate={navigate}
      activeSemesterName={activeSemester?.name ?? null}
    >
      {renderCurrentView()}
    </AppLayout>
  );
};
