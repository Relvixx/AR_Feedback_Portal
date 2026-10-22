'use client';

import { useState } from 'react';

interface NavigationProps {
  currentPage: 'create' | 'archive';
  onNavigate: (page: 'create' | 'archive') => void;
}

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const navItems = [
    { id: 'create', label: 'Generate report', icon: CreateIcon },
    { id: 'archive', label: 'Saved reports', icon: ArchiveIcon },
  ] as const;
  
  return (
    <nav className="sidebar-nav" aria-label="Main navigation">
      <div className="nav-section">
        <span className="nav-section-label">Workspace</span>
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              <span className="nav-item-icon" aria-hidden="true">
                <item.icon />
              </span>
              <span className="nav-item-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function CreateIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

function ArchiveIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <path d="M4 6h16v14H4zM3 3h18v3H3zM9 11h6" />
    </svg>
  );
}