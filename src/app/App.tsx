import React, { useEffect, useState } from 'react';
import { useRouter } from './router';
import { AppLayout } from '../components/layout/AppLayout';
import { DashboardView } from '../components/dashboard/DashboardView';
import { SubjectsView } from '../components/subjects/SubjectsView';
import { HistoryView } from '../components/history/HistoryView';
import { HeatmapView } from '../components/heatmap/HeatmapView';
import { SemestersView } from '../components/semesters/SemestersView';
import { SettingsView } from '../components/settings/SettingsView';
import { storage } from '../db/database';
import { Semester } from '../types/semester';

export const App: React.FC = () => {
  const { currentRoute, navigate } = useRouter();
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const settings = await storage.getSettings();
        if (settings.activeSemesterId) {
          const semester = await storage.getSemester(settings.activeSemesterId);
          if (semester && semester.status === 'active') {
            setActiveSemester(semester);
          }
        }
      } catch (err) {
        console.error('Error loading initial settings from storage:', err);
      } finally {
        setIsInitializing(false);
      }
    }

    init();
  }, []);

  const renderCurrentView = () => {
    switch (currentRoute) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigate={navigate}
            activeSemesterName={activeSemester?.name ?? null}
          />
        );
      case 'subjects':
        return <SubjectsView activeSemesterName={activeSemester?.name ?? null} />;
      case 'history':
        return <HistoryView />;
      case 'heatmap':
        return <HeatmapView />;
      case 'semesters':
        return <SemestersView activeSemesterName={activeSemester?.name ?? null} />;
      case 'settings':
        return <SettingsView />;
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs text-charcoal-muted animate-pulse">
          Loading application...
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
