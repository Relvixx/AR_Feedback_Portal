import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { withDevelopmentGuard } from '@/lib/api/guard';

async function getReportHandler(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const { id } = await params;
    const snapshot = await storage.getVersion(id);
    
    if (!snapshot) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Report fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}

export const GET = withDevelopmentGuard(getReportHandler);