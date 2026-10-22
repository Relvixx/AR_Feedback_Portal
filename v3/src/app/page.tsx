'use client';

import { useState, useCallback } from 'react';
import { AppShell } from '@/components/AppShell';
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
    const link = document.createElement('a');
    link.href = `/api/report/${activeReport.id}/pdf`;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [activeReport]);

  const handlePrint = useCallback(() => {
    if (!activeReport) return;
    window.open(`/api/report/${activeReport.id}/pdf`, '_blank');
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
    <AppShell currentPage={page} onNavigate={setPage}>
      {page === 'create' && (
        <section id="view-create">
          <div className="page-head">
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 11v6M12 7h.01" />
            </svg>
            <div>Reports use the same 10 feedback parameters as the reference workbook. Generated data is calculated consistently across all charts and saved as a fixed report snapshot.</div>
          </div>

          {activeReport && (
            <section className="report-block">
              <div className="report-header">
                <div className="report-meta">
                  <span className="report-badge">{activeReport.period === 'MID' ? 'Mid Semester' : 'End Semester'}</span>
                  <h2>{activeReport.academic.subjectName} · {activeReport.academic.academicYear}</h2>
                  <p className="report-subtitle">Version {activeReport.version} · Generated {new Date(activeReport.generatedAt).toLocaleString()}</p>
                </div>
                <div className="report-actions">
                  <button className="btn secondary" onClick={handleRegenerate} disabled={!activeReport}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                      <path d="M23 4v6h-6" />
                      <path d="M1 20v-6h6" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    Regenerate
                  </button>
                  <button className="btn secondary" onClick={handlePrint}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
                      <path d="M6 9V2h12v7" />
                      <path d="M6 14H4v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                      <path d="M10 14v-4" />
                      <path d="M14 10v4" />
                    </svg>
                    Print
                  </button>
                  <button className="btn primary" onClick={handleDownloadPDF}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
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
          <div className="page-head">
            <div>
              <div className="eyebrow">Records</div>
              <h1>Saved Reports</h1>
              <p className="subtitle">Reopen any earlier generated report, export the same data again, or create a new version.</p>
            </div>
            <button className="btn primary" onClick={() => setPage('create')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Report
            </button>
          </div>
          <div className="panel archive-panel">
            <SavedReports onOpen={handleOpenReport} />
          </div>
        </section>
      )}

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(undefined)} />
    </AppShell>
  );
}