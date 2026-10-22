'use client';

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
        <img alt="College logo" src="/assets/college_logo.png" />
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
  const labels: Array<{
    option: string;
    percentage: string;
    side: 'left' | 'right';
    edgeX: number;
    edgeY: number;
    outerX: number;
    outerY: number;
    y: number;
  }> = [];
  
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
    
    const mid = (angle + span / 2) * Math.PI / 180;
    labels.push({
      option: options[i],
      percentage: percentages[i].toFixed(1) + '%',
      side: Math.cos(mid) >= 0 ? 'right' : 'left',
      edgeX: cx + r * Math.cos(mid),
      edgeY: cy + r * Math.sin(mid),
      outerX: cx + (r + 8) * Math.cos(mid),
      outerY: cy + (r + 8) * Math.sin(mid),
      y: cy + (r + 14) * Math.sin(mid),
    });
    
    angle += span;
  });
  
  // Vertical packing for labels
  ['left', 'right'].forEach(side => {
    const items = labels.filter(x => x.side === side).sort((a, b) => a.y - b.y);
    for (let k = 1; k < items.length; k++) {
      if (items[k].y - items[k-1].y < 16) {
        items[k].y = items[k-1].y + 16;
      }
    }
    if (items.length) {
      const maxY = 150;
      const minY = 20;
      if (items[items.length - 1].y > maxY) {
        const shift = items[items.length - 1].y - maxY;
        items.forEach(it => it.y -= shift);
      }
      if (items[0].y < minY) {
        const shift = minY - items[0].y;
        items.forEach(it => it.y += shift);
      }
    }
  });
  
  const callouts = labels.map(item => {
    const lineEnd = item.side === 'right' ? 215 : 25;
    const textAnchor = item.side === 'right' ? 'start' : 'end';
    const textX = item.side === 'right' ? 220 : 20;
    return `
      <path d="M${item.edgeX.toFixed(2)} ${item.edgeY.toFixed(2)} L${item.outerX.toFixed(2)} ${item.outerY.toFixed(2)} L${lineEnd} ${item.y.toFixed(2)}" fill="none" stroke="#8a8a8a" stroke-width="1"/>
      <text x="${textX}" y="${(item.y - 1).toFixed(2)}" font-size="10" fill="#000" text-anchor="${textAnchor}">{escapeHtml(item.option)}</text>
      <text x="${textX}" y="${(item.y + 11).toFixed(2)}" font-size="9" fill="#666" text-anchor="${textAnchor}">{item.percentage}</text>
    `;
  }).join('');
  
  return `
    <svg class="chart-svg" viewBox="0 0 240 170" role="img" aria-label="Pie chart of answer percentages">
      ${paths}
      ${callouts}
    </svg>
  `;
}