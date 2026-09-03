import React from 'react';
import { EligibilityStatus } from '../../types/attendance';
import { CheckCircle2, AlertCircle, AlertTriangle, MinusCircle } from 'lucide-react';

interface AttendanceStatusProps {
  status: EligibilityStatus;
  description?: string;
  safeBunkCount?: number;
  classesToRecover?: number | null;
  variant?: 'badge' | 'callout' | 'compact';
  className?: string;
}

export const AttendanceStatus: React.FC<AttendanceStatusProps> = ({
  status,
  description,
  safeBunkCount,
  classesToRecover,
  variant = 'badge',
  className = '',
}) => {
  const config = {
    eligible: {
      label: 'On Track',
      badgeClass: 'bg-status-eligibleBg text-status-eligible border-[#cbe0d3]',
      calloutClass: 'bg-status-eligibleBg text-status-eligible border-[#cbe0d3]',
      icon: CheckCircle2,
    },
    at_risk: {
      label: 'Needs Attention',
      badgeClass: 'bg-status-warningBg text-status-warning border-[#fbd38d]',
      calloutClass: 'bg-status-warningBg text-status-warning border-[#fbd38d]',
      icon: AlertTriangle,
    },
    ineligible: {
      label: 'Target Unachievable',
      badgeClass: 'bg-status-ineligibleBg text-status-ineligible border-[#feb2b2]',
      calloutClass: 'bg-status-ineligibleBg text-status-ineligible border-[#feb2b2]',
      icon: AlertCircle,
    },
    not_started: {
      label: 'No Classes Held',
      badgeClass: 'bg-status-neutralBg text-status-neutral border-border',
      calloutClass: 'bg-status-neutralBg text-status-neutral border-border',
      icon: MinusCircle,
    },
  }[status];

  const Icon = config.icon;

  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-medium ${config.badgeClass} px-1.5 py-0.5 rounded border ${className}`}
      >
        <Icon className="w-3 h-3" aria-hidden="true" />
        <span>{config.label}</span>
      </span>
    );
  }

  if (variant === 'callout') {
    return (
      <div
        role="status"
        className={`p-3 rounded border text-xs leading-relaxed ${config.calloutClass} ${className}`}
      >
        <div className="flex items-start gap-2">
          <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <span className="font-semibold block">{config.label}</span>
            {description && <p className="opacity-95">{description}</p>}
            {status === 'eligible' && safeBunkCount !== undefined && safeBunkCount > 0 && (
              <p className="font-medium">
                {safeBunkCount === Infinity
                  ? 'Target is 0%: You can safely miss any number of classes.'
                  : `Safe bunks available: You can skip ${safeBunkCount} consecutive class${safeBunkCount === 1 ? '' : 'es'} without falling below target.`}
              </p>
            )}
            {status === 'at_risk' && classesToRecover !== null && classesToRecover !== undefined && classesToRecover > 0 && (
              <p className="font-medium">
                Recovery needed: Attend the next {classesToRecover} consecutive class{classesToRecover === 1 ? '' : 'es'} to recover eligibility.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default: badge
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded border ${config.badgeClass} ${className}`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};
