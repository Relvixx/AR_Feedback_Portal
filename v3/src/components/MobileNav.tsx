'use client';

import { useEffect, useCallback } from 'react';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: 'create' | 'archive';
  onNavigate: (page: 'create' | 'archive') => void;
}

export function MobileNav({ isOpen, onClose, currentPage, onNavigate }: MobileNavProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;
  
  const navItems = [
    { id: 'create', label: 'Create report', icon: CreateIcon },
    { id: 'archive', label: 'Saved reports', icon: ArchiveIcon },
  ] as const;
  
  return (
    <>
      <div 
        className="mobile-nav-overlay" 
        onClick={onClose}
        aria-hidden="true"
      />
      <div 
        className="mobile-nav" 
        role="dialog" 
        aria-modal="true" 
        aria-label="Navigation menu"
      >
        <div className="mobile-nav-header">
          <div className="mobile-nav-brand">
            <span className="mobile-nav-mark" aria-hidden="true">
              A<span style={{ color: '#B6654D' }}>&</span>R
            </span>
            <span className="mobile-nav-title">Feedback Portal</span>
          </div>
          <button
            className="mobile-nav-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="mobile-nav-list" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                className={`mobile-nav-item ${isActive ? 'mobile-nav-item-active' : ''}`}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="mobile-nav-item-icon" aria-hidden="true">
                  <item.icon />
                </span>
                <span className="mobile-nav-item-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="mobile-nav-footer">
          <strong>Automation & Robotics</strong>
          <small>MET&apos;s Institute of Technology<br />Internal faculty workspace</small>
        </div>
      </div>
    </>
  );
}

function CreateIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

function ArchiveIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <path d="M4 6h16v14H4zM3 3h18v3H3zM9 11h6" />
    </svg>
  );
}
