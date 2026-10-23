import { NextRequest, NextResponse } from 'next/server';
import { ListReportsQuerySchema } from '@/lib/validation/input';
import { storage } from '@/lib/storage';
import { withDevelopmentGuardSimple } from '@/lib/api/guard';

async function listReportsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = ListReportsQuerySchema.safeParse(Object.fromEntries(searchParams));
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const params = validation.data;
    const reports = await storage.listReports(params);
    const total = await storage.countReports(params);
    
    return NextResponse.json({ reports, total });
  } catch (error) {
    console.error('Reports list error:', error);
    return NextResponse.json(
      { error: 'Failed to list reports' },
      { status: 500 }
    );
  }
}

export const GET = withDevelopmentGuardSimple(listReportsHandler);