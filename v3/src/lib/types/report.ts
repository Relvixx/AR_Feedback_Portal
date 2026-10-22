/**
 * Type-safe domain model for reports, groups, and snapshots.
 */

import { QuestionDef } from '@/lib/feedback/questions';

export type FeedbackPeriod = 'MID' | 'END';

export const FEEDBACK_PERIOD_LABELS: Record<FeedbackPeriod, string> = {
  MID: 'Mid Semester',
  END: 'End Semester',
};

export const FEEDBACK_PERIOD_SHORT: Record<FeedbackPeriod, string> = {
  MID: 'MID',
  END: 'END',
};

export interface AcademicMetadata {
  academicYear: string;
  semester: number;
  department: string;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
}

export interface NormalizedAcademicIdentity {
  academicYear: string;
  semester: number;
  department: string;
  subjectCode: string;
  facultyName: string;
}

export interface QuestionSnapshot {
  questionId: string;
  title: string;
  options: readonly string[];
  bestOrder: readonly number[];
  counts: readonly number[];
  percentages: readonly number[];
}

export interface ReportSnapshot {
  id: string;
  groupId: string;
  version: number;
  period: FeedbackPeriod;
  algorithmVersion: string;
  seed: string;
  generatedAt: string;
  respondentCount: number;
  academic: AcademicMetadata;
  questions: readonly QuestionSnapshot[];
  dataOrigin: string;
}

export interface ReportGroup {
  id: string;
  identity: NormalizedAcademicIdentity;
  display: AcademicMetadata;
  baselineSeed: string;
  algorithmVersion: string;
  createdAt: string;
}

export interface CreateReportInput {
  academicYear: string;
  semester: number;
  subjectName: string;
  subjectCode: string;
  facultyName: string;
  period: FeedbackPeriod;
}

export interface RegenerateInput {
  reportId: string;
}

export interface ListReportsParams {
  academicYear?: string;
  semester?: number;
  subjectCode?: string;
  facultyName?: string;
  period?: FeedbackPeriod;
  limit?: number;
  offset?: number;
}

export interface ReportListItem {
  id: string;
  groupId: string;
  version: number;
  period: FeedbackPeriod;
  academicYear: string;
  semester: number;
  subjectName: string;
  subjectCode: string;
  facultyName: string;
  respondentCount: number;
  generatedAt: string;
}

export const DEPARTMENT = 'Automation and Robotics';
export const COLLEGE_NAME = "MET's Institute of Technology (P) B. Tech.";
export const AFFILIATION = 'Affiliated to Dr. Babasaheb Ambedkar Technological University, Lonere.';
export const DATA_ORIGIN = 'system-generated; no student survey was conducted';
export const ALGORITHM_VERSION = 'gen-v1.0';
export const DEFAULT_RESPONDENT_RANGE = { min: 42, max: 85 } as const;
export const MAX_DRIFT_PP = 8;