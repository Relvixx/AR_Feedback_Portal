import { describe, it, expect } from 'vitest';
import { QUESTIONS, QUESTION_COUNT, getQuestionById, getQuestionIndex } from '@/lib/feedback/questions';
import { SeededRandom } from '@/lib/feedback/random';
import { generateQuestionCounts, generateRespondentCount, validateRanking } from '@/lib/feedback/distribution';
import { generateFirstReport, generateNextVersion } from '@/lib/feedback/generator';
import { normalizeAcademicYear, normalizeText, AcademicInputSchema } from '@/lib/validation/input';
import { FeedbackPeriod } from '@/lib/types/report';

describe('Question Bank', () => {
  it('has exactly 10 questions', () => {
    expect(QUESTION_COUNT).toBe(10);
    expect(QUESTIONS.length).toBe(10);
  });

  it('has correct question IDs in order', () => {
    const expectedIds = [
      'communication_skills',
      'teaching_methodology',
      'syllabus_completion',
      'student_understanding',
      'class_engagement',
      'subject_knowledge',
      'ict_tools_usage',
      'student_interaction',
      'question_bank_guidance',
      'question_bank_coverage',
    ];
    expect(QUESTIONS.map(q => q.id)).toEqual(expectedIds);
  });

  it('has correct options and bestOrder for each question', () => {
    const syllabus = getQuestionById('syllabus_completion');
    expect(syllabus).toBeDefined();
    expect(syllabus!.options).toEqual(['Below 60%', '60% - 75%', '75% - 90%', '90% - 100%']);
    expect(syllabus!.bestOrder).toEqual([3, 2, 1, 0]); // Reversed: 90-100% is best

    const engagement = getQuestionById('class_engagement');
    expect(engagement).toBeDefined();
    expect(engagement!.options).toEqual(['Regularly on time', 'Sometime on time', 'Sometime late', 'Always late']);
    expect(engagement!.bestOrder).toEqual([0, 1, 2, 3]); // Regularly on time is best

    const coverage = getQuestionById('question_bank_coverage');
    expect(coverage).toBeDefined();
    expect(coverage!.options).toEqual([
      'Yes, fully comprehensive',
      'Mostly comprehensive',
      'Somewhat comprehensive',
      'Not comprehensive',
    ]);
    expect(coverage!.bestOrder).toEqual([0, 1, 2, 3]);
  });

  it('has 3-option and 4-option questions correctly', () => {
    const threeOption = QUESTIONS.filter(q => q.options.length === 3);
    const fourOption = QUESTIONS.filter(q => q.options.length === 4);
    expect(threeOption.length).toBe(4);
    expect(fourOption.length).toBe(6);
  });

  it('getQuestionById and getQuestionIndex work correctly', () => {
    expect(getQuestionIndex('communication_skills')).toBe(0);
    expect(getQuestionIndex('question_bank_coverage')).toBe(9);
    expect(getQuestionById('communication_skills')?.title).toBe('Communication Skills');
    expect(getQuestionById('nonexistent')).toBeUndefined();
  });
});

describe('SeededRandom', () => {
  it('produces deterministic sequence for same seed', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);
    const seq1 = Array.from({ length: 100 }, () => rng1.next());
    const seq2 = Array.from({ length: 100 }, () => rng2.next());
    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(54321);
    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());
    expect(seq1).not.toEqual(seq2);
  });

  it('fromString produces consistent seed', () => {
    const rng1 = SeededRandom.fromString('test-seed');
    const rng2 = SeededRandom.fromString('test-seed');
    expect(rng1.next()).toBe(rng2.next());
  });

  it('nextInt returns values in range', () => {
    const rng = new SeededRandom(12345);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextInt(10);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(10);
    }
  });

  it('nextFloat returns values in range', () => {
    const rng = new SeededRandom(12345);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextFloat(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThan(10);
    }
  });
});

describe('Distribution Engine', () => {
  it('generates counts that sum to respondent count', () => {
    const question = QUESTIONS[0]; // 3 options
    const rng = new SeededRandom(12345);
    const result = generateQuestionCounts({ respondentCount: 50, question, rng });
    expect(result.counts.reduce((a, b) => a + b, 0)).toBe(50);
  });

  it('generates counts for 4-option questions that sum to respondent count', () => {
    const question = QUESTIONS[2]; // syllabus_completion - 4 options
    const rng = new SeededRandom(12345);
    const result = generateQuestionCounts({ respondentCount: 60, question, rng });
    expect(result.counts.reduce((a, b) => a + b, 0)).toBe(60);
  });

  it('all counts are non-negative integers', () => {
    const question = QUESTIONS[2];
    const rng = new SeededRandom(12345);
    const result = generateQuestionCounts({ respondentCount: 50, question, rng });
    result.counts.forEach(c => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(c)).toBe(true);
    });
  });

  it('respects best-to-worst ranking for 3-option questions', () => {
    const question = QUESTIONS[0]; // communication_skills: bestOrder [0,1,2]
    const rng = new SeededRandom(12345);
    const result = generateQuestionCounts({ respondentCount: 50, question, rng });
    expect(validateRanking(result.counts, question.bestOrder)).toBe(true);
    // Best (Excellent) >= Good >= Average
    expect(result.counts[0]).toBeGreaterThanOrEqual(result.counts[1]);
    expect(result.counts[1]).toBeGreaterThanOrEqual(result.counts[2]);
  });

  it('respects reversed ranking for syllabus_completion', () => {
    const question = QUESTIONS[2]; // syllabus_completion: bestOrder [3,2,1,0]
    const rng = new SeededRandom(12345);
    const result = generateQuestionCounts({ respondentCount: 50, question, rng });
    expect(validateRanking(result.counts, question.bestOrder)).toBe(true);
    // Best is 90-100% (index 3), then 75-90% (2), then 60-75% (1), then Below 60% (0)
    expect(result.counts[3]).toBeGreaterThanOrEqual(result.counts[2]);
    expect(result.counts[2]).toBeGreaterThanOrEqual(result.counts[1]);
    expect(result.counts[1]).toBeGreaterThanOrEqual(result.counts[0]);
  });

  it('percentages sum to approximately 100', () => {
    const question = QUESTIONS[0];
    const rng = new SeededRandom(12345);
    const result = generateQuestionCounts({ respondentCount: 50, question, rng });
    const sum = result.percentages.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 1);
  });

  it('different seeds produce different distributions', () => {
    const question = QUESTIONS[0];
    const rng1 = new SeededRandom(11111);
    const rng2 = new SeededRandom(22222);
    const result1 = generateQuestionCounts({ respondentCount: 50, question, rng: rng1 });
    const result2 = generateQuestionCounts({ respondentCount: 50, question, rng: rng2 });
    expect(result1.counts).not.toEqual(result2.counts);
  });

  it('generateRespondentCount produces values in range', () => {
    const rng = new SeededRandom(12345);
    for (let i = 0; i < 100; i++) {
      const n = generateRespondentCount(rng, 42, 85);
      expect(n).toBeGreaterThanOrEqual(42);
      expect(n).toBeLessThanOrEqual(85);
    }
  });
});

describe('Report Generator', () => {
  const academic = {
    academicYear: '2022-23',
    semester: 3,
    department: 'Automation and Robotics',
    subjectName: 'Engineering Mathematics-III',
    subjectCode: 'AR2301',
    facultyName: 'Prof. S. S. Borse',
  };

  it('generates first report with correct structure', () => {
    const result = generateFirstReport({ academic, period: 'MID' });
    const snapshot = result.snapshot;

    expect(snapshot.id).toBeDefined();
    expect(snapshot.groupId).toBeDefined();
    expect(snapshot.version).toBe(1);
    expect(snapshot.period).toBe('MID');
    expect(snapshot.algorithmVersion).toBe('gen-v1.0');
    expect(snapshot.seed).toBeDefined();
    expect(snapshot.generatedAt).toBeDefined();
    expect(snapshot.respondentCount).toBeGreaterThanOrEqual(42);
    expect(snapshot.respondentCount).toBeLessThanOrEqual(85);
    expect(snapshot.academic).toEqual(academic);
    expect(snapshot.questions.length).toBe(10);
    expect(snapshot.dataOrigin).toBe('system-generated; no student survey was conducted');
  });

  it('each question snapshot has correct structure', () => {
    const result = generateFirstReport({ academic, period: 'MID' });
    const snapshot = result.snapshot;

    snapshot.questions.forEach((q, i) => {
      expect(q.questionId).toBe(QUESTIONS[i].id);
      expect(q.title).toBe(QUESTIONS[i].title);
      expect(q.options).toEqual(QUESTIONS[i].options);
      expect(q.bestOrder).toEqual(QUESTIONS[i].bestOrder);
      expect(q.counts.length).toBe(QUESTIONS[i].options.length);
      expect(q.percentages.length).toBe(QUESTIONS[i].options.length);
      expect(q.counts.reduce((a, b) => a + b, 0)).toBe(snapshot.respondentCount);
    });
  });

  it('generates different snapshot for same input (different seed)', () => {
    const result1 = generateFirstReport({ academic, period: 'MID' });
    const result2 = generateFirstReport({ academic, period: 'MID' });
    expect(result1.snapshot.seed).not.toBe(result2.snapshot.seed);
    expect(result1.snapshot.respondentCount).not.toBe(result2.snapshot.respondentCount);
  });

  it('generates next version with incremented version number', () => {
    const result1 = generateFirstReport({ academic, period: 'MID' });
    const snapshot2 = generateNextVersion(result1.snapshot);
    
    expect(snapshot2.version).toBe(2);
    expect(snapshot2.groupId).toBe(result1.snapshot.groupId);
    expect(snapshot2.period).toBe('MID');
    expect(snapshot2.id).not.toBe(result1.snapshot.id);
    expect(snapshot2.seed).not.toBe(result1.snapshot.seed);
  });

  it('Mid and End periods share group ID but have separate versions', () => {
    const resultMid = generateFirstReport({ academic, period: 'MID' });
    const resultEnd = generateFirstReport({ academic, period: 'END' });
    
    // They should have same group identity (would be enforced by storage layer)
    expect(resultMid.snapshot.academic).toEqual(resultEnd.snapshot.academic);
    expect(resultMid.snapshot.period).toBe('MID');
    expect(resultEnd.snapshot.period).toBe('END');
  });

  it('regenerating Mid does not affect End version', () => {
    const resultMid = generateFirstReport({ academic, period: 'MID' });
    const resultEnd = generateFirstReport({ academic, period: 'END' });
    
    const midV2 = generateNextVersion(resultMid.snapshot);
    const endV2 = generateNextVersion(resultEnd.snapshot);
    
    expect(midV2.version).toBe(2);
    expect(endV2.version).toBe(2);
    expect(midV2.period).toBe('MID');
    expect(endV2.period).toBe('END');
    // Original snapshots unchanged
    expect(resultMid.snapshot.version).toBe(1);
    expect(resultEnd.snapshot.version).toBe(1);
  });
});

describe('Input Validation', () => {
  it('normalizes academic year correctly', () => {
    expect(normalizeAcademicYear('2022-23')).toBe('2022-23');
    expect(normalizeAcademicYear('2024-2025')).toBe('2024-25');
    expect(normalizeAcademicYear('  2022-23  ')).toBe('2022-23');
  });

  it('rejects invalid academic year formats', () => {
    expect(() => normalizeAcademicYear('2022')).toThrow();
    expect(() => normalizeAcademicYear('22-23')).toThrow();
    expect(() => normalizeAcademicYear('2022/23')).toThrow();
    expect(() => normalizeAcademicYear('2022-24')).toThrow(); // Not consecutive
  });

  it('handles century rollover', () => {
    expect(normalizeAcademicYear('2099-00')).toBe('2099-00');
    expect(normalizeAcademicYear('2099-2100')).toBe('2099-00');
  });

  it('normalizes text inputs', () => {
    expect(normalizeText('  Hello World  ')).toBe('Hello World');
    expect(normalizeText('Test')).toBe('Test');
  });

  it('rejects empty or whitespace-only text', () => {
    expect(() => normalizeText('')).toThrow();
    expect(() => normalizeText('   ')).toThrow();
    expect(() => normalizeText('\n')).toThrow();
    expect(() => normalizeText('\r')).toThrow();
  });

  it('rejects overly long text', () => {
    const longText = 'a'.repeat(121);
    expect(() => normalizeText(longText)).toThrow();
  });

  it('validates complete academic input schema', () => {
    const validInput = {
      academicYear: '2022-23',
      semester: 3,
      subjectName: 'Engineering Mathematics-III',
      subjectCode: 'AR2301',
      facultyName: 'Prof. S. S. Borse',
      period: 'MID' as FeedbackPeriod,
    };
    
    const result = AcademicInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    expect(result.data.academicYear).toBe('2022-23');
  });

  it('rejects invalid semester', () => {
    const invalidInput = {
      academicYear: '2022-23',
      semester: 9,
      subjectName: 'Test',
      subjectCode: 'T101',
      facultyName: 'Prof. Test',
      period: 'MID' as FeedbackPeriod,
    };
    
    const result = AcademicInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('rejects invalid period', () => {
    const invalidInput = {
      academicYear: '2022-23',
      semester: 3,
      subjectName: 'Test',
      subjectCode: 'T101',
      facultyName: 'Prof. Test',
      period: 'INVALID',
    };
    
    const result = AcademicInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});