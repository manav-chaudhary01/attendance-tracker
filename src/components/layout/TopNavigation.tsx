import React, { useState } from 'react';
import { AppRoute, ROUTES } from '../../app/router';
import { Menu, X, CalendarCheck2 } from 'lucide-react';

interface TopNavigationProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  activeSemesterName?: string | null;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  currentRoute,
  onNavigate,
  activeSemesterName,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (route: AppRoute) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#fbfbf9] border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Title & Semester indicator */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-2 text-charcoal hover:text-accent transition-colors font-medium text-sm tracking-tight"
            >
              <CalendarCheck2 className="w-4 h-4 text-accent" aria-hidden="true" />
              <span>Attendance Tracker</span>
            </button>

            {activeSemesterName ? (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-charcoal-muted bg-background-subtle border border-border rounded">
                {activeSemesterName}
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-charcoal-light bg-background-subtle border border-border rounded">
                No active semester
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center space-x-1">
            <ul role="list" className="flex items-center space-x-1">
              {ROUTES.map((route) => {
                const isActive = currentRoute === route.id;
                return (
                  <li key={route.id}>
                    <button
                      type="button"
                      onClick={() => handleNavClick(route.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        isActive
                          ? 'text-accent bg-accent-light border border-accent-subtle font-semibold'
                          : 'text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-transparent'
                      }`}
                    >
                      {route.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            {activeSemesterName && (
              <span className="text-[11px] text-charcoal-muted truncate max-w-[120px]">
                {activeSemesterName}
              </span>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Menu className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown navigation */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile Navigation"
            className="md:hidden py-2 pb-3 border-t border-border"
          >
            <ul role="list" className="space-y-1">
              {ROUTES.map((route) => {
                const isActive = currentRoute === route.id;
                return (
                  <li key={route.id}>
                    <button
                      type="button"
                      onClick={() => handleNavClick(route.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full text-left px-3 py-2 text-xs font-medium rounded transition-colors ${
                        isActive
                          ? 'text-accent bg-accent-light border border-accent-subtle font-semibold'
                          : 'text-charcoal-muted hover:text-charcoal hover:bg-background-subtle'
                      }`}
                    >
                      {route.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
};
