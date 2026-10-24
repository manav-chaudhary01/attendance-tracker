import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopNavigation } from './TopNavigation';

describe('TopNavigation Component', () => {
  it('renders all route labels and indicates current route via aria-current', () => {
    const handleNavigate = vi.fn();
    render(
      <TopNavigation
        currentRoute="dashboard"
        onNavigate={handleNavigate}
        activeSemesterName="Fall 2026"
      />
    );

    // Check desktop buttons
    const dashboardButtons = screen.getAllByRole('button', { name: /dashboard/i });
    expect(dashboardButtons.length).toBeGreaterThan(0);
    expect(dashboardButtons[0]).toHaveAttribute('aria-current', 'page');

    const subjectsButtons = screen.getAllByRole('button', { name: /subjects/i });
    expect(subjectsButtons[0]).not.toHaveAttribute('aria-current');

    // Verify semester badge
    expect(screen.getAllByText('Fall 2026').length).toBeGreaterThan(0);
  });

  it('triggers onNavigate when a link is clicked', () => {
    const handleNavigate = vi.fn();
    render(
      <TopNavigation
        currentRoute="dashboard"
        onNavigate={handleNavigate}
        activeSemesterName={null}
      />
    );

    const subjectsButtons = screen.getAllByRole('button', { name: /subjects/i });
    fireEvent.click(subjectsButtons[0]!);

    expect(handleNavigate).toHaveBeenCalledWith('subjects');
  });

  it('toggles mobile menu when toggle button is clicked', () => {
    const handleNavigate = vi.fn();
    render(
      <TopNavigation
        currentRoute="dashboard"
        onNavigate={handleNavigate}
        activeSemesterName={null}
      />
    );

    const toggleButton = screen.getByRole('button', { name: /open navigation menu/i });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    // Mobile nav list is now in DOM
    const mobileNav = screen.getByRole('navigation', { name: /mobile navigation/i });
    expect(mobileNav).toBeInTheDocument();
  });
});
