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
      {/* Mobile top header - only displayed on viewports < 768px */}
      {isMobile && (
        <header className="mobile-header">
          <Brand variant="compact" />
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        </header>
      )}
      
      {/* Mobile Drawer Navigation (only rendered when mobile) */}
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
      
      {/* Desktop Sidebar (only for tablet/desktop >= 768px) */}
      {!isMobile && (
        <aside className="sidebar" aria-label="Main desktop navigation">
          <div className="sidebar-header">
            <Brand variant="full" />
          </div>
          <Navigation currentPage={currentPage} onNavigate={onNavigate} />
          <div className="sidebar-footer">
            <strong>Automation & Robotics</strong>
            <small>MET&apos;s Institute of Technology<br />Internal faculty workspace</small>
          </div>
        </aside>
      )}
      
      <main className="main-content" role="main">
        {children}
      </main>
    </div>
  );
}
