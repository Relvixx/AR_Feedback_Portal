'use client';

import { useState, useEffect } from 'react';
import { ReportListItem } from '@/lib/types/report';
import { escapeHtml } from '@/lib/utils/escape';

interface SavedReportsProps {
  onOpen: (id: string) => void;
}

export function SavedReports({ onOpen }: SavedReportsProps) {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'MID' | 'END' | ''>('');
  const [semesterFilter, setSemesterFilter] = useState<number | ''>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadReports() {
      try {
        const params = new URLSearchParams();
        if (yearFilter) params.set('academicYear', yearFilter);
        if (semesterFilter) params.set('semester', String(semesterFilter));
        if (periodFilter) params.set('period', periodFilter);
        params.set('limit', '100');
        params.set('offset', '0');
        
        const res = await fetch(`/api/reports?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load reports');
        const data = await res.json();
        if (!ignore) {
          setReports(data.reports || []);
          setTotal(data.total || 0);
          setLoading(false);
        }
      } catch (e) {
        if (!ignore) {
          console.error('Failed to load reports:', e);
          setLoading(false);
        }
      }
    }

    loadReports();

    return () => {
      ignore = true;
    };
  }, [yearFilter, semesterFilter, periodFilter]);

  const filteredReports = reports.filter(r => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.subjectName.toLowerCase().includes(query) ||
      r.subjectCode.toLowerCase().includes(query) ||
      r.academicYear.toLowerCase().includes(query) ||
      r.facultyName.toLowerCase().includes(query) ||
      String(r.semester).includes(query)
    );
  });

  const periodLabel = (period: 'MID' | 'END') => period === 'MID' ? 'Mid Semester' : 'End Semester';

  return (
    <div className="archive-panel">
      <div className="archive-header">
        <div className="archive-header-left">
          <h2 className="panel-title">Report Archive</h2>
          <p className="panel-desc" id="archive-count">
            {total} stored report{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="archive-filters">
          <div className="filter-group">
            <input
              className="filter-input"
              id="archive-search"
              placeholder="Search subject, code, year..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search reports"
            />
          </div>
          <div className="filter-group">
            <select
              className="filter-input filter-select"
              value={periodFilter}
              onChange={e => {
                setLoading(true);
                setPeriodFilter(e.target.value as 'MID' | 'END' | '');
              }}
              aria-label="Filter by period"
            >
              <option value="">All Periods</option>
              <option value="MID">Mid Semester</option>
              <option value="END">End Semester</option>
            </select>
          </div>
          <div className="filter-group">
            <select
              className="filter-input filter-select"
              value={semesterFilter}
              onChange={e => {
                setLoading(true);
                setSemesterFilter(e.target.value ? parseInt(e.target.value, 10) : '');
              }}
              aria-label="Filter by semester"
            >
              <option value="">All Semesters</option>
              <option value="1">I</option>
              <option value="2">II</option>
              <option value="3">III</option>
              <option value="4">IV</option>
              <option value="5">V</option>
              <option value="6">VI</option>
              <option value="7">VII</option>
              <option value="8">VIII</option>
            </select>
          </div>
          <div className="filter-group">
            <input
              className="filter-input"
              placeholder="Year (e.g. 2022-23)"
              value={yearFilter}
              onChange={e => {
                setLoading(true);
                setYearFilter(e.target.value);
              }}
              aria-label="Filter by academic year"
            />
          </div>
          {(periodFilter || semesterFilter || yearFilter || searchQuery) && (
            <button
              className="btn ghost"
              onClick={() => {
                setLoading(true);
                setPeriodFilter('');
                setSemesterFilter('');
                setYearFilter('');
                setSearchQuery('');
              }}
              style={{ padding: '8px 16px' }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-state" style={{ padding: '40px 0', textAlign: 'center' }}>
          <div className="loading-spinner" aria-label="Loading reports">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" style={{ width: 32, height: 32, margin: '0 auto' }}>
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--terracotta, #B6654D)" strokeLinecap="round" />
            </svg>
          </div>
          <p style={{ color: 'var(--muted, #536B68)', marginTop: 12 }}>Loading reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 48, height: 48, margin: '0 auto 16px', color: 'var(--muted-light, #7E9794)' }}>
            <path d="M4 5h16M4 12h16M4 19h16" />
          </svg>
          <h3>No matching reports</h3>
          <p>Generate a report or change your search.</p>
        </div>
      ) : (
        <div id="archive-table-wrap">
          <div className="table-wrapper">
            <table className="archive-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Academic year</th>
                  <th>Semester</th>
                  <th>Faculty</th>
                  <th>Period</th>
                  <th>Version</th>
                  <th>Generated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(r => (
                  <tr key={r.id}>
                    <td>
                      <strong>{escapeHtml(r.subjectName)}</strong>
                      <small>{escapeHtml(r.subjectCode)}</small>
                    </td>
                    <td>{escapeHtml(r.academicYear)}</td>
                    <td>{escapeHtml(String(r.semester))}</td>
                    <td>{escapeHtml(r.facultyName)}</td>
                    <td>
                      <span className={`period-badge ${r.period === 'MID' ? 'period-badge-mid' : 'period-badge-end'}`}>
                        {periodLabel(r.period)}
                      </span>
                    </td>
                    <td>v{r.version}</td>
                    <td>{new Date(r.generatedAt).toLocaleString()}</td>
                    <td>
                      <button
                        className="link-btn"
                        onClick={() => onOpen(r.id)}
                      >
                        Open
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true" style={{ width: 14, height: 14, marginLeft: 4, verticalAlign: 'middle' }}>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
