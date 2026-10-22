'use client';

import { useState, useEffect } from 'react';

interface BrandProps {
  variant?: 'full' | 'compact' | 'icon';
  className?: string;
}

export function Brand({ variant = 'full', className = '' }: BrandProps) {
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    const updateWidth = () => setWidth(window.innerWidth);
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  
  // Auto-switch to compact/icon on narrow viewports
  const effectiveVariant = width < 480 ? 'icon' : width < 768 ? 'compact' : variant;
  
  return (
    <div className={`brand ${className}`} data-variant={effectiveVariant}>
      <div className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 42" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="42">
          <rect width="40" height="42" rx="11" fill="#f7fafc"/>
          <text x="50%" y="56%" dominant-baseline="central" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="19" font-weight="850" fill="#143e62" letter-spacing="-0.5px">
            A<tspan fill="#e7a549">&</tspan>R
          </text>
        </svg>
      </div>
      {effectiveVariant !== 'icon' && (
        <div className="brand-copy">
          <strong>Feedback Portal</strong>
          <span>Academic reporting workspace</span>
        </div>
      )}
    </div>
  );
}