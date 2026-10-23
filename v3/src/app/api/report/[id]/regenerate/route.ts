import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { generateNextVersion } from '@/lib/feedback/generator';
import { withDevelopmentGuard } from '@/lib/api/guard';

async function regenerateReportHandler(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const { id } = await params;
    const existingSnapshot = await storage.getVersion(id);
    
    if (!existingSnapshot) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    
    const newSnapshot = generateNextVersion(existingSnapshot);
    await storage.saveVersion(newSnapshot);
    
    return NextResponse.json(newSnapshot, { status: 201 });
  } catch (error) {
    console.error('Report regeneration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate report' },
      { status: 500 }
    );
  }
}

export const POST = withDevelopmentGuard(regenerateReportHandler);