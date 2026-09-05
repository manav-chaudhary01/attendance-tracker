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
      className={`bg-background-subtle border border-border rounded p-6 sm:p-8 text-center max-w-lg mx-auto ${className}`}
    >
      {Icon && (
        <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-accent-light text-accent mb-3">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-charcoal mb-1.5">{title}</h3>
      <p className="text-xs text-charcoal-muted leading-relaxed mb-4 max-w-md mx-auto">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="px-3.5 py-1.5 text-xs font-medium bg-accent text-white rounded hover:bg-accent-hover transition-colors"
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="px-3.5 py-1.5 text-xs font-medium bg-background border border-border text-charcoal-muted hover:text-charcoal rounded hover:bg-background-subtle transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
