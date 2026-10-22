/**
 * Input validation and normalization using Zod.
 */

import { z } from 'zod';
import { FeedbackPeriod, FEEDBACK_PERIOD_LABELS, type NormalizedAcademicIdentity } from '@/lib/types/report';

export const ACADEMIC_YEAR_REGEX = /^\d{4}-\d{2,4}$/;

export function normalizeAcademicYear(input: string): string {
  const trimmed = input.trim();
  if (!ACADEMIC_YEAR_REGEX.test(trimmed)) {
    throw new Error('Academic year must be in format YYYY-YY or YYYY-YYYY');
  }
  
  const [left, right] = trimmed.split('-');
  const leftNum = parseInt(left, 10);
  const rightNum = parseInt(right, 10);
  
  const expectedRight = (leftNum + 1) % (right.length === 2 ? 100 : 10000);
  if (rightNum !== expectedRight) {
    throw new Error('Academic year must be consecutive (e.g., 2022-23)');
  }
  
  // Normalize to YYYY-YY format
  if (right.length === 4) {
    const shortRight = String(rightNum % 100).padStart(2, '0');
    return `${leftNum}-${shortRight}`;
  }
  return trimmed;
}

export function normalizeText(input: string, maxLength = 120): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Value is required');
  }
  if (trimmed.length > maxLength) {
    throw new Error(`Value must be at most ${maxLength} characters`);
  }
  if (/[\n\r]/.test(trimmed)) {
    throw new Error('Value cannot contain line breaks');
  }
  return trimmed;
}

export const AcademicInputSchema = z.object({
  academicYear: z.string().min(1).max(10).refine(
    (val) => ACADEMIC_YEAR_REGEX.test(val),
    'Academic year must be in format YYYY-YY or YYYY-YYYY'
  ).refine(
    (val) => {
      const [left, right] = val.split('-');
      const leftNum = parseInt(left, 10);
      const rightNum = parseInt(right, 10);
      return rightNum === (leftNum + 1) % (right.length === 2 ? 100 : 10000);
    },
    'Academic year must be consecutive (e.g., 2022-23)'
  ).transform(normalizeAcademicYear),
  semester: z.number().int().min(1).max(8),
  subjectName: z.string().min(1).max(120).refine(
    (val) => !/[\n\r]/.test(val),
    'Subject name cannot contain line breaks'
  ).transform((val) => normalizeText(val)),
  subjectCode: z.string().min(1).max(120).refine(
    (val) => !/[\n\r]/.test(val),
    'Subject code cannot contain line breaks'
  ).transform((val) => normalizeText(val)),
  facultyName: z.string().min(1).max(120).refine(
    (val) => !/[\n\r]/.test(val),
    'Faculty name cannot contain line breaks'
  ).transform((val) => normalizeText(val)),
  period: z.enum(['MID', 'END']),
});

export type AcademicInput = z.infer<typeof AcademicInputSchema>;

export function createNormalizedIdentity(input: AcademicInput): NormalizedAcademicIdentity {
  return {
    academicYear: input.academicYear,
    semester: input.semester,
    department: 'Automation and Robotics',
    subjectCode: input.subjectCode.trim(),
    facultyName: input.facultyName.trim(),
  };
}

export function identityToGroupKey(identity: NormalizedAcademicIdentity): string {
  const parts = [
    identity.academicYear.toLowerCase(),
    String(identity.semester),
    identity.department.toLowerCase(),
    identity.subjectCode.toLowerCase(),
    identity.facultyName.toLowerCase(),
  ];
  return parts.join('|');
}

export const RegenerateSchema = z.object({
  reportId: z.string().min(1),
});

export type RegenerateInput = z.infer<typeof RegenerateSchema>;

export const ListReportsQuerySchema = z.object({
  academicYear: z.string().optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  subjectCode: z.string().optional(),
  facultyName: z.string().optional(),
  period: z.enum(['MID', 'END']).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListReportsQuery = z.infer<typeof ListReportsQuerySchema>;