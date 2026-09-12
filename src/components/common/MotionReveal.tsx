import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface MotionRevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  duration?: number;
  className?: string;
  as?: React.ElementType;
}

export const MotionReveal: React.FC<MotionRevealProps> = ({
  children,
  delay = 0,
  direction = 'up',
  distance = 14,
  duration = 380,
  className = '',
  as: Component = 'div',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ delayMs: delay });

  if (prefersReducedMotion) {
    return <Component className={className}>{children}</Component>;
  }

  let transformInitial = 'none';
  if (direction === 'up') transformInitial = `translateY(${distance}px)`;
  else if (direction === 'down') transformInitial = `translateY(-${distance}px)`;
  else if (direction === 'left') transformInitial = `translateX(${distance}px)`;
  else if (direction === 'right') transformInitial = `translateX(-${distance}px)`;

  const style: React.CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'none' : transformInitial,
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
    willChange: isVisible ? 'auto' : 'opacity, transform',
  };

  return (
    <Component ref={ref} style={style} className={className}>
      {children}
    </Component>
  );
};
