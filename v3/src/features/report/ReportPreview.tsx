'use client';

import Image from 'next/image';
import { ReportSnapshot } from '@/lib/types/report';
import { escapeHtml } from '@/lib/utils/escape';

interface ReportPreviewProps {
  report: ReportSnapshot;
}

const PIE_COLORS = ['#2377AC', '#E6AC44', '#61A59D', '#C86F6A'];

export function ReportPreview({ report }: ReportPreviewProps) {
  const charts = report.questions.map((q, i) => ({
    number: i + 1,
    title: q.title,
    options: q.options,
    counts: q.counts,
    percentages: q.percentages,
    total: report.respondentCount,
  }));

  return (
    <div className="preview" id="report-preview">
      <div className="sheet-header">
        <Image
          alt="College logo"
          src="/college_logo.png"
          width={120}
          height={56}
          priority
        />
        <div className="sheet-institute">
          <h2>MET&apos;s Institute of Technology (P) B. Tech.</h2>
          <p>Affiliated to Dr. Babasaheb Ambedkar Technological University, Lonere.</p>
        </div>
      </div>
      <div className="sheet-subhead">
        <strong>Department of Automation and Robotics</strong>
        <div>{report.period === 'MID' ? 'Mid' : 'End'} Semester Feedback — A.Y. {escapeHtml(report.academic.academicYear)}</div>
      </div>
      <div className="meta">
        <div><label>Subject code</label>{escapeHtml(report.academic.subjectCode)}</div>
        <div><label>Semester</label>{escapeHtml(String(report.academic.semester))}</div>
        <div><label>Subject</label>{escapeHtml(report.academic.subjectName)}</div>
        <div><label>Faculty / Staff</label>{escapeHtml(report.academic.facultyName)}</div>
      </div>
      <div className="chart-grid">
        {charts.map((chart) => (
          <div key={chart.number} className="chart-card">
            <h3>{String(chart.number).padStart(2, '0')}. {chart.title}</h3>
            <div className="chart-content">
              <PieChartSVG
                counts={chart.counts}
                total={chart.total}
              />
            </div>
            <div className="chart-legend">
              {chart.options.map((opt, idx) => {
                if (chart.counts[idx] === 0) return null;
                return (
                  <div key={idx} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span 
                      className="legend-color" 
                      style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: PIE_COLORS[idx % PIE_COLORS.length], flexShrink: 0 }} 
                    />
                    <span className="legend-label" style={{ fontSize: '11px', color: '#172b3a', flex: 1 }}>{opt}</span>
                    <span className="legend-percent" style={{ fontSize: '11px', color: '#617386', fontWeight: 600 }}>{chart.percentages[idx].toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
            <div className="chart-foot">Total: {chart.total}</div>
          </div>
        ))}
      </div>
      <div className="remarks">
        <h4>REMARKS</h4>
        <p>Remark by HoD:</p>
      </div>
      <div className="small-note">
        Internal working report — Figures are system-generated and do not represent collected student responses.
      </div>
    </div>
  );
}

function PieChartSVG({ counts, total }: { counts: readonly number[]; total: number }) {
  const cx = 120;
  const cy = 85;
  const r = 50;

  let currentAngle = -90;
  const paths: React.ReactNode[] = [];

  counts.forEach((v, i) => {
    if (v === 0) return;
    const span = (v / total) * 360;
    const start = (currentAngle * Math.PI) / 180;
    const end = ((currentAngle + span) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const largeArc = span > 180 ? 1 : 0;

    paths.push(
      <path
        key={i}
        d={`M${cx} ${cy} L${x1.toFixed(3)} ${y1.toFixed(3)} A${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`}
        fill={PIE_COLORS[i % PIE_COLORS.length]}
        stroke="#fff"
        strokeWidth="1.2"
      />
    );

    currentAngle += span;
  });

  return (
    <svg className="chart-svg" viewBox="0 0 240 170" role="img" aria-label="Pie chart of answer percentages">
      {paths}
    </svg>
  );
}
