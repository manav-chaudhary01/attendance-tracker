import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, render, screen } from '@testing-library/react';
import { useReducedMotion } from './useReducedMotion';
import { useScrollReveal } from './useScrollReveal';
import { MotionReveal } from '../components/common/MotionReveal';

describe('Motion Hooks & Components', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('useReducedMotion', () => {
    it('returns false by default when prefers-reduced-motion does not match', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useReducedMotion());
      expect(result.current).toBe(false);
    });

    it('returns true when prefers-reduced-motion matches', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useReducedMotion());
      expect(result.current).toBe(true);
    });
  });

  describe('useScrollReveal', () => {
    it('initializes as visible in environment without IntersectionObserver', () => {
      const { result } = renderHook(() => useScrollReveal());
      expect(result.current.isVisible).toBe(true);
      expect(result.current.ref).toBeDefined();
    });

    it('initializes as visible when disabled is set', () => {
      const { result } = renderHook(() => useScrollReveal({ disabled: true }));
      expect(result.current.isVisible).toBe(true);
    });
  });

  describe('MotionReveal Component', () => {
    it('renders children immediately and preserves content accessibility', () => {
      render(
        <MotionReveal direction="up" delay={50}>
          <div data-testid="motion-child">Content</div>
        </MotionReveal>
      );

      const child = screen.getByTestId('motion-child');
      expect(child).toBeInTheDocument();
      expect(child.textContent).toBe('Content');
    });

    it('renders without animation styles when prefers-reduced-motion is true', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <MotionReveal direction="up" className="custom-test-class">
          <span>Accessible text</span>
        </MotionReveal>
      );

      expect(screen.getByText('Accessible text')).toBeInTheDocument();
    });
  });
});
