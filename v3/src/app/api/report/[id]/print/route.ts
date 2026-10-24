import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { renderPDFDocument } from '@/lib/pdf/generator';
import { withDevelopmentGuard } from '@/lib/api/guard';

async function printReportHandler(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const { id } = await params;
    const snapshot = await storage.getVersion(id);

    if (!snapshot) {
      return new NextResponse('Report not found', { status: 404 });
    }

    let html = renderPDFDocument(snapshot);

    // Inject print toolbar and auto-print script
    const printEnhancements = `
<style>
@media print {
  .no-print-toolbar { display: none !important; }
}
@media screen {
  body {
    background: #3a3d40 !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .no-print-toolbar {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    height: 52px;
    background: #1f2224;
    color: #f1f3f4;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.5);
    z-index: 99999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .toolbar-title {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.2px;
  }
  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .toolbar-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: background 0.15s, transform 0.05s;
  }
  .toolbar-btn:active {
    transform: scale(0.98);
  }
  .btn-print-primary {
    background: #1a73e8;
    color: white;
  }
  .btn-print-primary:hover {
    background: #1557b0;
  }
  .btn-print-secondary {
    background: #444746;
    color: #f1f3f4;
  }
  .btn-print-secondary:hover {
    background: #5e6260;
  }
  .page {
    margin: 30px auto !important;
    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
    background: white;
  }
}
</style>
<div class="no-print-toolbar">
  <div class="toolbar-title">
    A&amp;R Feedback Report — ${snapshot.academic.subjectCode} (${snapshot.period})
  </div>
  <div class="toolbar-actions">
    <button class="toolbar-btn btn-print-primary" onclick="window.print()">
      🖨️ Print / Save as PDF
    </button>
    <button class="toolbar-btn btn-print-secondary" onclick="window.close()">
      ✕ Close
    </button>
  </div>
</div>
<script>
  window.addEventListener('load', function() {
    setTimeout(function() {
      window.print();
    }, 450);
  });
</script>
</body>
`;

    html = html.replace('</body>', printEnhancements);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Print view error:', error);
    return new NextResponse('Failed to render print view', { status: 500 });
  }
}

export const GET = withDevelopmentGuard(printReportHandler);
