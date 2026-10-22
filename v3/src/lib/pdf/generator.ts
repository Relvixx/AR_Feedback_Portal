import { readFileSync } from 'fs';
import { join } from 'path';
import { ReportSnapshot, FeedbackPeriod } from '@/lib/types/report';

const TEMPLATE_PATH = join(process.cwd(), 'src/lib/pdf/template.html');
const LOGO_PATH = join(process.cwd(), '../../assets/college_logo.png');
let cachedTemplate: string | null = null;
let cachedLogoBase64: string | null = null;

function getTemplate(): string {
  if (!cachedTemplate) {
    cachedTemplate = readFileSync(TEMPLATE_PATH, 'utf-8');
  }
  return cachedTemplate;
}

function getLogoBase64(): string {
  if (!cachedLogoBase64) {
    try {
      const logoBuffer = readFileSync(LOGO_PATH);
      cachedLogoBase64 = logoBuffer.toString('base64');
    } catch {
      cachedLogoBase64 = '';
    }
  }
  return cachedLogoBase64;
}

interface ChartData {
  number: number;
  title: string;
  options: readonly string[];
  counts: readonly number[];
  percentages: readonly number[];
  total: number;
}

function renderChartsHTML(charts: ChartData[], startIdx: number, count: number): string {
  return charts
    .slice(startIdx, startIdx + count)
    .map((chart, i) => {
      const idx = startIdx + i + 1;
      const svg = generatePieChartSVG(chart);
      return `
        <div class="chart-card">
          <h3>${String(idx).padStart(2, '0')}. ${escapeHtml(chart.title)}</h3>
          <div class="chart-content">${svg}</div>
          <div class="chart-foot">Total: ${chart.total}</div>
        </div>
      `;
    })
    .join('');
}

function generatePieChartSVG(chart: ChartData): string {
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
      <text x="${textX}" y="${(item.y - 1).toFixed(2)}" font-size="10" fill="#000" text-anchor="${textAnchor}">${escapeHtml(item.option)}</text>
      <text x="${textX}" y="${(item.y + 11).toFixed(2)}" font-size="9" fill="#666" text-anchor="${textAnchor}">${item.percentage}</text>
    `;
  }).join('');
  
  return `
    <svg class="chart-svg" viewBox="0 0 240 170" role="img" aria-label="Pie chart of answer percentages">
      ${paths}
      ${callouts}
    </svg>
  `;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

function periodLabel(period: FeedbackPeriod): string {
  return period === 'MID' ? 'Mid Semester' : 'End Semester';
}

function renderTemplate(report: ReportSnapshot): string {
  const template = getTemplate();
  const logoBase64 = getLogoBase64();
  
  const charts: ChartData[] = report.questions.map(q => ({
    number: 0,
    title: q.title,
    options: q.options,
    counts: q.counts,
    percentages: q.percentages,
    total: report.respondentCount,
  }));
  
  const page1Charts = renderChartsHTML(charts, 0, 6);
  const page2Charts = renderChartsHTML(charts, 6, 4);
  
  const filled = template
    .replace('{{LOGO_BASE64}}', logoBase64)
    .replace('{{COLLEGE_NAME}}', "MET's Institute of Technology (P) B. Tech.")
    .replace('{{AFFILIATION}}', 'Affiliated to Dr. Babasaheb Ambedkar Technological University, Lonere.')
    .replace('{{DEPARTMENT}}', 'Department of Automation and Robotics')
    .replace('{{PERIOD_LABEL}}', periodLabel(report.period))
    .replace('{{ACADEMIC_YEAR}}', report.academic.academicYear)
    .replace('{{SUBJECT_CODE}}', escapeHtml(report.academic.subjectCode))
    .replace('{{SEMESTER}}', String(report.academic.semester))
    .replace('{{SUBJECT_NAME}}', escapeHtml(report.academic.subjectName))
    .replace('{{FACULTY_NAME}}', escapeHtml(report.academic.facultyName))
    .replace('{{PAGE1_CHARTS}}', page1Charts)
    .replace('{{PAGE2_CHARTS}}', page2Charts)
    .replace('{{RESPONDENT_COUNT}}', String(report.respondentCount))
    .replace('{{DATA_ORIGIN}}', report.dataOrigin);
  
  return filled;
}

export async function generatePDF(report: ReportSnapshot): Promise<Buffer> {
  const { chromium } = await import('playwright');
  
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    const html = renderTemplate(report);
    
    await page.setContent(html, { waitUntil: 'networkidle' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}