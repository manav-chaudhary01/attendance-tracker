import { useState, useEffect } from 'react';

export type AppRoute =
  | 'dashboard'
  | 'subjects'
  | 'history'
  | 'heatmap'
  | 'semesters'
  | 'settings';

export const ROUTES: { id: AppRoute; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'history', label: 'History' },
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'semesters', label: 'Semesters' },
  { id: 'settings', label: 'Settings' },
];

function getRouteFromHash(): AppRoute {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  const match = ROUTES.find((r) => r.id === hash);
  return match ? match.id : 'dashboard';
}

export function useRouter() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getRouteFromHash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(getRouteFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (route: AppRoute) => {
    window.location.hash = `#${route}`;
    setCurrentRoute(route);
  };

  return { currentRoute, navigate };
}
