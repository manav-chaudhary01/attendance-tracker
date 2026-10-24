import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  delayMs?: number;
  disabled?: boolean;
}

/**
 * Hook to trigger a one-time scroll reveal animation when an element enters the viewport.
 * Falls back immediately to visible if prefers-reduced-motion is active or IntersectionObserver is unavailable.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
) {
  const { threshold = 0.1, rootMargin = '0px 0px -40px 0px', delayMs = 0, disabled = false } = options;
  const prefersReducedMotion = useReducedMotion();
  const elementRef = useRef<T | null>(null);

  // If reduced motion is requested or disabled, show immediately
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (disabled || prefersReducedMotion) return true;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return true;
    return false;
  });

  useEffect(() => {
    if (isVisible || disabled || prefersReducedMotion) return;

    const element = elementRef.current;
    if (!element) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          if (delayMs > 0) {
            const timer = setTimeout(() => {
              setIsVisible(true);
            }, delayMs);
            observer.disconnect();
            return () => clearTimeout(timer);
          } else {
            setIsVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isVisible, disabled, prefersReducedMotion, threshold, rootMargin, delayMs]);

  return { ref: elementRef, isVisible };
}
