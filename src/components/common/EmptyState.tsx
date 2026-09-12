import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  action,
  secondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`tactile-card p-6 sm:p-8 text-center max-w-lg mx-auto ${className}`}
    >
      {Icon && (
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-accent-light text-accent mb-3.5 shadow-2xs">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-charcoal mb-1.5">{title}</h3>
      <p className="text-xs text-charcoal-muted leading-relaxed mb-5 max-w-md mx-auto">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="px-4 py-2 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-all duration-200 tactile-button shadow-2xs"
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="px-4 py-2 text-xs font-medium bg-background border border-border text-charcoal-muted hover:text-charcoal rounded-md hover:bg-background-subtle transition-all duration-200 tactile-button"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
