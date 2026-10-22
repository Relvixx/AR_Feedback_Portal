'use client';

import { useState, useEffect } from 'react';
import { Brand } from '@/components/Brand';
import { Navigation } from '@/components/Navigation';
import { MobileNav } from '@/components/MobileNav';

interface AppShellProps {
  children: React.ReactNode;
  currentPage: 'create' | 'archive';
  onNavigate: (page: 'create' | 'archive') => void;
}

export function AppShell({ children, currentPage, onNavigate }: AppShellProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return (
    <div className="app-shell">
      <header className="mobile-header">
        <Brand variant={isMobile ? 'compact' : 'full'} />
        {isMobile && (
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        )}
      </header>
      
      {isMobile && (
        <MobileNav
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentPage={currentPage}
          onNavigate={(page) => {
            onNavigate(page);
            setSidebarOpen(false);
          }}
        />
      )}
      
      <aside 
        className={`sidebar ${isMobile ? 'sidebar-mobile' : ''} ${sidebarOpen ? 'sidebar-open' : ''}`}
        aria-hidden={isMobile && !sidebarOpen}
      >
        <div className="sidebar-header">
          <Brand variant={isMobile ? 'compact' : 'full'} />
        </div>
        <Navigation currentPage={currentPage} onNavigate={onNavigate} />
        <div className="sidebar-footer">
          <strong>Automation & Robotics</strong>
          <small>MET&apos;s Institute of Technology<br />Internal faculty workspace</small>
        </div>
      </aside>
      
      {isMobile && sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      
      <main className="main-content" role="main">
        {children}
      </main>
    </div>
  );
}