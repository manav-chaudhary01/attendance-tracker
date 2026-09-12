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
    <header className="sticky top-0 z-40 bg-[#faf9f6]/95 backdrop-blur-md border-b border-border transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Title & Semester indicator */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className="group flex items-center gap-2.5 text-charcoal hover:text-accent transition-all duration-200 font-medium text-sm tracking-tight active:scale-[0.98]"
            >
              <div className="p-1 rounded-md bg-accent-light text-accent group-hover:bg-accent group-hover:text-white transition-colors duration-200">
                <CalendarCheck2 className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <span className="font-semibold text-charcoal group-hover:text-accent transition-colors duration-200">
                Attendance Tracker
              </span>
            </button>

            {activeSemesterName ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs text-charcoal-muted bg-background-subtle border border-border rounded-full transition-all duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-subtle-pulse" aria-hidden="true" />
                <span className="font-medium text-charcoal">{activeSemesterName}</span>
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-charcoal-light bg-background-subtle border border-border rounded-full">
                No active semester
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center">
            <ul role="list" className="flex items-center p-1 bg-background-subtle/70 border border-border/80 rounded-lg space-x-1">
              {ROUTES.map((route) => {
                const isActive = currentRoute === route.id;
                return (
                  <li key={route.id}>
                    <button
                      type="button"
                      onClick={() => handleNavClick(route.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`relative px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ease-organimo tactile-button ${
                        isActive
                          ? 'text-accent bg-white border border-border/80 shadow-xs font-semibold'
                          : 'text-charcoal-muted hover:text-charcoal hover:bg-white/60 border border-transparent'
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
              <span className="text-[11px] font-medium text-charcoal-muted truncate max-w-[120px]">
                {activeSemesterName}
              </span>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-md text-charcoal-muted hover:text-charcoal hover:bg-background-subtle border border-border tactile-button"
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
            className="md:hidden py-2 pb-3 border-t border-border animate-reveal-down"
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
                      className={`w-full text-left px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
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
