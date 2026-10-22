'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ReportListItem, ListReportsParams } from '@/lib/types/report';
import { escapeHtml } from '@/lib/utils/escape';

interface SavedReportsProps {
  onOpen: (id: string) => void;
}

export function SavedReports({ onOpen }: SavedReportsProps) {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Partial<ListReportsParams>>({});
  const [total, setTotal] = useState(0);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        // Client-side filtering for search query
      }
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.set(key, String(value));
        }
      });
      params.set('limit', '100');
      params.set('offset', '0');
      
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load reports');
      const data = await res.json();
      setReports(data.reports);
      setTotal(data.total);
    } catch (e) {
      console.error('Failed to load reports:', e);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

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

  if (loading) {
    return (
      <div className="archive-panel" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ color: '#718296' }}>Loading reports…</div>
      </div>
    );
  }

  if (!filteredReports.length) {
    return (
      <div className="empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 48, height: 48, margin: '0 auto 16px', color: '#c4d5e3' }}>
          <path d="M4 5h16M4 12h16M4 19h16" />
        </svg>
        <h3>No matching reports</h3>
        <p>Generate a report or change your search.</p>
      </div>
    );
  }

  return (
    <div className="archive-panel">
      <div className="archive-header">
        <div>
          <h2 className="panel-title">Report Archive</h2>
          <p className="panel-desc" id="archive-count">
            {total} stored report{total !== 1 ? 's' : ''}
          </p>
        </div>
        <input
          className="filter-input"
          id="archive-search"
          placeholder="Search subject, code, year..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>
      <div id="archive-table-wrap">
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
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: r.period === 'MID' ? '#dbeafe' : '#fef3c7',
                    color: r.period === 'MID' ? '#1e40af' : '#92400e',
                  }}>
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
                    Open ↗
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}