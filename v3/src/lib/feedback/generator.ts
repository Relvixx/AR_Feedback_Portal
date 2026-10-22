/**
 * Report generation engine - creates deterministic, immutable report snapshots.
 */

import { v4 as uuidv4 } from 'uuid';
import { SeededRandom, deriveSeed, seedToNumber } from './random';
import { generateQuestionCounts, generateRespondentCount } from './distribution';
import { QUESTIONS, QuestionDef } from './questions';
import {
  ReportSnapshot,
  QuestionSnapshot,
  AcademicMetadata,
  FeedbackPeriod,
  NormalizedAcademicIdentity,
  ALGORITHM_VERSION,
  DATA_ORIGIN,
  DEFAULT_RESPONDENT_RANGE,
} from '@/lib/types/report';

export interface GenerationContext {
  groupId: string;
  baselineSeed: string;
  period: FeedbackPeriod;
  version: number;
  academic: AcademicMetadata;
}

function createQuestionSnapshot(
  question: QuestionDef,
  counts: number[],
  percentages: number[]
): QuestionSnapshot {
  return {
    questionId: question.id,
    title: question.title,
    options: question.options,
    bestOrder: question.bestOrder,
    counts: counts,
    percentages: percentages,
  };
}

function computeGroupId(identity: NormalizedAcademicIdentity): string {
  // Simple hash for group ID - in production would use crypto
  let hash = 0;
  const str = JSON.stringify(identity);
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `grp_${(hash >>> 0).toString(16)}`;
}

function generateBaselineSeed(): string {
  // Generate a random baseline seed for a new group
  const array = new Uint32Array(4);
  crypto.getRandomValues(array);
  return Array.from(array).map(n => n.toString(16).padStart(8, '0')).join('');
}

export function createReportGroup(identity: NormalizedAcademicIdentity, display: AcademicMetadata): {
  groupId: string;
  baselineSeed: string;
  createdAt: string;
} {
  return {
    groupId: computeGroupId(identity),
    baselineSeed: generateBaselineSeed(),
    createdAt: new Date().toISOString(),
  };
}

export function generateReportSnapshot(
  context: GenerationContext
): ReportSnapshot {
  const { groupId, baselineSeed, period, version, academic } = context;
  
  // Derive seed for this specific version
  const versionSeed = deriveSeed(baselineSeed, `${period}_v${version}`);
  const rng = new SeededRandom(seedToNumber(versionSeed));
  
  // Generate respondent count
  const respondentCount = generateRespondentCount(
    rng,
    DEFAULT_RESPONDENT_RANGE.min,
    DEFAULT_RESPONDENT_RANGE.max
  );
  
  // Generate counts for all questions
  const questions: QuestionSnapshot[] = [];
  for (const question of QUESTIONS) {
    const qRng = new SeededRandom(seedToNumber(deriveSeed(versionSeed, `q_${question.id}`)));
    const { counts, percentages } = generateQuestionCounts({
      respondentCount,
      question,
      rng: qRng,
    });
    questions.push(createQuestionSnapshot(question, counts, percentages));
  }
  
  const generatedAt = new Date().toISOString();
  const id = uuidv4();
  
  return {
    id,
    groupId,
    version,
    period,
    algorithmVersion: ALGORITHM_VERSION,
    seed: versionSeed,
    generatedAt,
    respondentCount,
    academic,
    questions,
    dataOrigin: DATA_ORIGIN,
  };
}

export function generateFirstReport(
  input: {
    academic: AcademicMetadata;
    period: FeedbackPeriod;
  }
): { groupId: string; baselineSeed: string; snapshot: ReportSnapshot } {
  const identity: NormalizedAcademicIdentity = {
    academicYear: input.academic.academicYear,
    semester: input.academic.semester,
    department: input.academic.department,
    subjectCode: input.academic.subjectCode,
    facultyName: input.academic.facultyName,
  };
  
  const { groupId, baselineSeed, createdAt } = createReportGroup(identity, input.academic);
  
  const snapshot = generateReportSnapshot({
    groupId,
    baselineSeed,
    period: input.period,
    version: 1,
    academic: input.academic,
  });
  
  return { groupId, baselineSeed, snapshot };
}

export function generateNextVersion(
  previousSnapshot: ReportSnapshot,
  newPeriod?: FeedbackPeriod
): ReportSnapshot {
  const period = newPeriod ?? previousSnapshot.period;
  const nextVersion = previousSnapshot.version + 1;
  
  return generateReportSnapshot({
    groupId: previousSnapshot.groupId,
    baselineSeed: previousSnapshot.seed, // Use previous seed as baseline for next version
    period,
    version: nextVersion,
    academic: previousSnapshot.academic,
  });
}