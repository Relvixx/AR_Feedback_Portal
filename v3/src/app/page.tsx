'use client';

import { useState, useEffect, useCallback } from 'react';
import { Brand } from '@/components/Brand';
import { ReportForm } from '@/features/report/ReportForm';
import { ReportPreview } from '@/features/report/ReportPreview';
import { SavedReports } from '@/features/archive/SavedReports';
import { Toast } from '@/components/Toast';
import { ReportSnapshot } from '@/lib/types/report';

type Page = 'create' | 'archive';

export default function HomePage() {
  const [page, setPage] = useState<Page>('create');
  const [activeReport, setActiveReport] = useState<ReportSnapshot | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | undefined>(undefined);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(undefined), 3500);
  }, []);

  const handleReportGenerated = useCallback((report: ReportSnapshot) => {
    setActiveReport(report);
    setPage('create');
    showToast('Report generated and saved.', 'success');
  }, [showToast]);

  const handleRegenerate = useCallback(async () => {
    if (!activeReport) return;
    try {
      const res = await fetch(`/api/report/${activeReport.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to regenerate');
      const report = await res.json();
      setActiveReport(report);
      showToast('Fresh numbers generated; earlier report preserved.', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to regenerate', 'error');
    }
  }, [activeReport, showToast]);

  const handleDownloadPDF = useCallback(() => {
    if (!activeReport) return;
    // Use anchor element for file download to avoid lint warning
    const link = document.createElement('a');
    link.href = `/api/report/${activeReport.id}/pdf`;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [activeReport]);

  const handleOpenReport = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/report/${id}`);
      if (!res.ok) throw new Error('Report not found');
      const report = await res.json();
      setActiveReport(report);
      setPage('create');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to open report', 'error');
    }
  }, [showToast]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Brand />
        </div>
        <div className="side-label">Workspace</div>
        <button
          className={`nav-button ${page === 'create' ? 'active' : ''}`}
          onClick={() => setPage('create')}
          aria-label="Generate report"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="M8 9h8M8 13h8M8 17h5" />
          </svg>
          <span>Generate report</span>
        </button>
        <button
          className={`nav-button ${page === 'archive' ? 'active' : ''}`}
          onClick={() => setPage('archive')}
          aria-label="Saved reports"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M4 6h16v14H4zM3 3h18v3H3zM9 11h6" />
          </svg>
          <span>Saved reports</span>
        </button>
        <div className="side-bottom">
          <strong>Automation & Robotics</strong>
          <small>MET&apos;s Institute of Technology<br />Internal faculty workspace</small>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="topbar-left">
            WORKSPACE <span>/</span> <b id="current-breadcrumb">{page === 'create' ? 'Generate report' : 'Saved reports'}</b>
          </div>
          <div className="top-aux">
            <span className="version">v3.0</span>
            <div className="top-pill">
              <span className="dot" />
              Local development
            </div>
          </div>
        </div>

        {page === 'create' && (
          <section id="view-create">
            <div className="head">
              <div>
                <div className="eyebrow">Academic reporting</div>
                <h1>Generate Feedback Report</h1>
                <p className="subtitle">Enter academic details, build charts, and export a print-ready feedback report.</p>
              </div>
            </div>
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <h2 className="panel-title">Report Information</h2>
                  <p className="panel-desc">Academic and subject details for the report header</p>
                </div>
                <span className="step">01 / Details</span>
              </div>
              <ReportForm onGenerate={handleReportGenerated} initialReport={activeReport} />
            </div>
            <div className="info-strip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 11v6M12 7h.01" />
              </svg>
              <div>Reports use the same 10 feedback parameters as the reference workbook. Generated data is calculated consistently across all charts and saved as a fixed report snapshot.</div>
            </div>
            {activeReport && (
              <section className="report-block">
                <div className="report-actions">
                  <div>
                    <div className="eyebrow">Report preview</div>
                    <h2>{activeReport.academic.subjectName} · {activeReport.academic.academicYear}</h2>
                  </div>
                  <div className="action-buttons">
                    <button className="btn secondary" onClick={handleRegenerate}>↻ Regenerate</button>
                    <button className="btn primary" onClick={handleDownloadPDF}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
                        <path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4" />
                      </svg>
                      Download PDF
                    </button>
                  </div>
                </div>
                <ReportPreview report={activeReport} />
              </section>
            )}
          </section>
        )}

        {page === 'archive' && (
          <section id="view-archive">
            <div className="head">
              <div>
                <div className="eyebrow">Records</div>
                <h1>Saved Reports</h1>
                <p className="subtitle">Reopen any earlier generated report, export the same data again, or create a new version.</p>
              </div>
              <button className="btn primary" onClick={() => setPage('create')}>+ New report</button>
            </div>
            <div className="panel archive-panel">
              <SavedReports onOpen={handleOpenReport} />
            </div>
          </section>
        )}

        <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(undefined)} />
      </main>
    </div>
  );
}