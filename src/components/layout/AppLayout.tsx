import React from 'react';
import { AppRoute } from '../../app/router';
import { TopNavigation } from './TopNavigation';
import { SkipLink } from '../common/SkipLink';

interface AppLayoutProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  activeSemesterName?: string | null;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentRoute,
  onNavigate,
  activeSemesterName,
  children,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-charcoal">
      <SkipLink />
      <TopNavigation
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        activeSemesterName={activeSemesterName}
      />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 outline-none"
      >
        {children}
      </main>
      <footer className="border-t border-border py-4 bg-[#fbfbf9] text-xs text-charcoal-light">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Personal Attendance Tracker • Private &amp; offline in IndexedDB</span>
          <span>No account required • All data stays in your browser</span>
        </div>
      </footer>
    </div>
  );
};
