'use client';

import Image from 'next/image';
import { ReportSnapshot } from '@/lib/types/report';
import { escapeHtml } from '@/lib/utils/escape';

interface ReportPreviewProps {
  report: ReportSnapshot;
}

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
          src="/assets/college_logo.png"
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
        <div>{report.period === 'MID' ? 'Mid' : 'End'} Semester Feedback · A.Y. {escapeHtml(report.academic.academicYear)}</div>
      </div>
      <div className="meta">
        <div><label>Subject code</label>{escapeHtml(report.academic.subjectCode)}</div>
        <div><label>Semester</label>{escapeHtml(String(report.academic.semester))}</div>
        <div><label>Subject</label>{escapeHtml(report.academic.subjectName)}</div>
        <div><label>Faculty / Staff</label>{escapeHtml(report.academic.facultyName)}</div>
      </div>
      <div className="chart-grid">
        {charts.map((chart, i) => (
          <div key={i} className="chart-card">
            <h3>{String(chart.number).padStart(2, '0')}. {escapeHtml(chart.title)}</h3>
            <div className="chart-content">{generatePieChartSVG(chart)}</div>
            <div className="chart-legend">{generateLegend(chart)}</div>
            <div className="chart-foot">Total: {chart.total}</div>
          </div>
        ))}
      </div>
      <div className="remarks">
        <h4>REMARKS</h4>
        <p>Remark HoD:</p>
      </div>
      <div className="small-note">
        Internal working report · Figures are system-generated and do not represent collected student responses.
      </div>
    </div>
  );
}

function generatePieChartSVG(chart: {
  options: readonly string[];
  counts: readonly number[];
  percentages: readonly number[];
  total: number;
}): string {
  const { options, counts, percentages, total } = chart;
  const cx = 120;
  const cy = 85;
  const r = 50;
  
  const colors = ['#2377AC', '#E6AC44', '#61A59D', '#C86F6A'];
  
  let angle = -90;
  let paths = '';
  
  counts.forEach((v, i) => {
    if (v === 0) return;
    const span = (v / total) * 360;
    const start = angle * Math.PI / 180;
    const end = (angle + span) * Math.PI / 180;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const largeArc = span > 180 ? 1 : 0;
    
    paths += `<path d="M${cx} ${cy} L${x1.toFixed(3)} ${y1.toFixed(3)} A${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z" fill="${colors[i % colors.length]}" stroke="#fff" stroke-width="1.2"/>`;
    
    angle += span;
  });
  
  return `
    <svg class="chart-svg" viewBox="0 0 240 170" role="img" aria-label="Pie chart of answer percentages">
      ${paths}
    </svg>
  `;
}

function generateLegend(chart: {
  options: readonly string[];
  counts: readonly number[];
  percentages: readonly number[];
  total: number;
}): string {
  const { options, counts, percentages } = chart;
  
  const colors = ['#2377AC', '#E6AC44', '#61A59D', '#C86F6A'];
  
  const items = options.map((option, i) => {
    if (counts[i] === 0) return null;
    return `
      <div class="legend-item" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span class="legend-color" style="width: 12px; height: 12px; border-radius: 3px; background-color: ${colors[i % colors.length]}; flex-shrink: 0;"></span>
        <span class="legend-label" style="font-size: 11px; color: #172b3a; flex: 1;">${escapeHtml(option)}</span>
        <span class="legend-percent" style="font-size: 11px; color: #617386; font-weight: 600;">${percentages[i].toFixed(1)}%</span>
      </div>
    `;
  }).filter(Boolean).join('');
  
  return `
    <div class="chart-legend" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e1e8ef;">
      ${items}
    </div>
  `;
}