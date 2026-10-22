import { NextRequest, NextResponse } from 'next/server';
import { AcademicInputSchema } from '@/lib/validation/input';
import { generateFirstReport, generateNextVersion } from '@/lib/feedback/generator';
import { storage } from '@/lib/storage';
import { FeedbackPeriod } from '@/lib/types/report';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = AcademicInputSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const input = validation.data;
    const period: FeedbackPeriod = input.period;
    
    const academic = {
      academicYear: input.academicYear,
      semester: input.semester,
      department: 'Automation and Robotics',
      subjectName: input.subjectName,
      subjectCode: input.subjectCode,
      facultyName: input.facultyName,
    };
    
    // Check if group exists
    const identity = {
      academicYear: input.academicYear,
      semester: input.semester,
      department: 'Automation and Robotics',
      subjectCode: input.subjectCode,
      facultyName: input.facultyName,
    };
    
    let existingGroup = await storage.getGroupByIdentity(identity);
    let snapshot;
    
    if (existingGroup) {
      // Group exists, check for existing versions of this period
      const latestVersion = await storage.getLatestVersion(existingGroup.id, period);
      if (latestVersion) {
        // Generate next version
        snapshot = generateNextVersion(latestVersion, period);
      } else {
        // First version of this period for existing group
        const result = generateFirstReport({ academic, period });
        snapshot = result.snapshot;
      }
    } else {
      // New group entirely
      const result = generateFirstReport({ academic, period });
      await storage.createGroup({
        id: result.groupId,
        identity,
        display: academic,
        baselineSeed: result.baselineSeed,
        algorithmVersion: 'gen-v1.0',
        createdAt: new Date().toISOString(),
      });
      snapshot = result.snapshot;
    }
    
    await storage.saveVersion(snapshot);
    
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
}