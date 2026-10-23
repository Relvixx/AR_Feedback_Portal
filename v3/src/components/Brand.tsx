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
  
  const effectiveVariant = width > 0 && width < 480 ? 'icon' : width > 0 && width < 768 ? 'compact' : variant;
  
  return (
    <div className={`brand ${className}`} data-variant={effectiveVariant}>
      <div className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 42" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="42">
          <rect width="40" height="42" rx="11" fill="#F7F5F0" stroke="#E2DDD5" strokeWidth="1"/>
          <text
            x="50%"
            y="56%"
            dominantBaseline="central"
            textAnchor="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="19"
            fontWeight="850"
            fill="#1B302E"
            letterSpacing="-0.5px"
          >
            A<tspan fill="#B6654D">&</tspan>R
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
