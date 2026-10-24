import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { generatePDF } from '@/lib/pdf/generator';
import { withDevelopmentGuard } from '@/lib/api/guard';

async function downloadPDFHandler(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const { id } = await params;
    const snapshot = await storage.getVersion(id);
    
    if (!snapshot) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    
    try {
      const pdfBuffer = await generatePDF(snapshot);
      const safeSubjectCode = snapshot.academic.subjectCode.replace(/[^a-zA-Z0-9_-]+/g, '_');
      const filename = `Feedback_${safeSubjectCode}_${snapshot.academic.academicYear}_${snapshot.period}.pdf`;
      
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      });
    } catch (pdfError) {
      console.warn('Headless browser unavailable on server, redirecting to print view:', pdfError);
      return NextResponse.redirect(new URL(`/api/report/${id}/print`, request.url));
    }
  } catch (error) {
    console.error('Report lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve report' },
      { status: 500 }
    );
  }
}

export const GET = withDevelopmentGuard(downloadPDFHandler);