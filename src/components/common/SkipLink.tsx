import React from 'react';

export const SkipLink: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-charcoal focus:text-white focus:text-sm focus:font-medium focus:rounded focus:shadow-sm"
    >
      Skip to main content
    </a>
  );
};
