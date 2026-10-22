import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { generatePDF } from '@/lib/pdf/generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const snapshot = await storage.getVersion(id);
    
    if (!snapshot) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    
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
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}