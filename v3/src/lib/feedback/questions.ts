/**
 * Canonical feedback question definitions.
 * Single source of truth for all questions, options, and quality ranking.
 */

export interface QuestionDef {
  id: string;
  title: string;
  options: readonly string[];
  bestOrder: readonly number[];
}

export const QUESTIONS: readonly QuestionDef[] = [
  {
    id: 'communication_skills',
    title: 'Communication Skills',
    options: ['Excellent', 'Good', 'Average'],
    bestOrder: [0, 1, 2],
  },
  {
    id: 'teaching_methodology',
    title: 'Teaching Methodology',
    options: ['Excellent', 'Good', 'Average'],
    bestOrder: [0, 1, 2],
  },
  {
    id: 'syllabus_completion',
    title: 'Syllabus Completion',
    options: ['Below 60%', '60% - 75%', '75% - 90%', '90% - 100%'],
    bestOrder: [3, 2, 1, 0],
  },
  {
    id: 'student_understanding',
    title: 'Student Understanding',
    options: ['Excellent', 'Good', 'Average'],
    bestOrder: [0, 1, 2],
  },
  {
    id: 'class_engagement',
    title: 'Class Engagement',
    options: ['Regularly on time', 'Sometime on time', 'Sometime late', 'Always late'],
    bestOrder: [0, 1, 2, 3],
  },
  {
    id: 'subject_knowledge',
    title: 'Subject Knowledge',
    options: ['Excellent', 'Good', 'Average'],
    bestOrder: [0, 1, 2],
  },
  {
    id: 'ict_tools_usage',
    title: 'ICT Tools Usage',
    options: ['Always', 'Sometimes', 'Rarely', 'Never'],
    bestOrder: [0, 1, 2, 3],
  },
  {
    id: 'student_interaction',
    title: 'Student Interaction',
    options: ['Always', 'Sometimes', 'Rarely', 'Never'],
    bestOrder: [0, 1, 2, 3],
  },
  {
    id: 'question_bank_guidance',
    title: 'Question Bank Guidance',
    options: ['Very effectively', 'Effectively', 'Somewhat effectively', 'Ineffectively'],
    bestOrder: [0, 1, 2, 3],
  },
  {
    id: 'question_bank_coverage',
    title: 'Question Bank Coverage',
    options: ['Yes, fully comprehensive', 'Mostly comprehensive', 'Somewhat comprehensive', 'Not comprehensive'],
    bestOrder: [0, 1, 2, 3],
  },
] as const;

export type QuestionId = (typeof QUESTIONS)[number]['id'];

export function getQuestionById(id: QuestionId): QuestionDef | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

export function getQuestionIndex(id: QuestionId): number {
  return QUESTIONS.findIndex((q) => q.id === id);
}

export const QUESTION_COUNT = QUESTIONS.length;
export const QUESTIONS_PER_PAGE_1 = 6;
export const QUESTIONS_PER_PAGE_2 = 4;