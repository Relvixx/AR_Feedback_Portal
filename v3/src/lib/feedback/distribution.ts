/**
 * Distribution logic for generating integer category counts that respect ranking.
 */

import { SeededRandom, seedToNumber } from './random';
import { QuestionDef } from './questions';

export interface GenerationParams {
  respondentCount: number;
  question: QuestionDef;
  rng: SeededRandom;
}

export interface GenerationResult {
  counts: number[];
  percentages: number[];
}

/**
 * Generate ordered weights for a question's options.
 * For 3-option questions: best > medium > worst
 * For 4-option questions: best > second > third > worst
 * Weights are generated in best-to-worst order, then mapped to display order.
 */
function generateOrderedWeights(rng: SeededRandom, optionCount: number): number[] {
  const weights: number[] = [];
  
  if (optionCount === 3) {
    // Three tiers: best (0.55-0.75), medium (0.20-0.35), worst (0.03-0.10)
    weights.push(rng.nextFloat(0.55, 0.75));
    weights.push(rng.nextFloat(0.20, 0.35));
    weights.push(rng.nextFloat(0.03, 0.10));
  } else {
    // Four tiers: best (0.45-0.65), second (0.20-0.30), third (0.10-0.20), worst (0.02-0.08)
    weights.push(rng.nextFloat(0.45, 0.65));
    weights.push(rng.nextFloat(0.20, 0.30));
    weights.push(rng.nextFloat(0.10, 0.20));
    weights.push(rng.nextFloat(0.02, 0.08));
  }
  
  return weights;
}

/**
 * Allocate integer counts from weights using largest remainder method.
 * Ensures sum equals respondentCount exactly.
 */
function allocateCounts(weights: number[], total: number): number[] {
  const n = weights.length;
  const exact = weights.map(w => w * total);
  const floors = exact.map(e => Math.floor(e));
  let sum = floors.reduce((a, b) => a + b, 0);
  const remainders = exact.map((e, i) => ({ index: i, remainder: e - floors[i] }));
  
  remainders.sort((a, b) => b.remainder - a.remainder);
  
  for (let i = 0; i < total - sum; i++) {
    floors[remainders[i].index]++;
  }
  
  return floors;
}

/**
 * Map counts from best-to-worst order to display order using bestOrder indices.
 */
function mapToDisplayOrder(counts: number[], bestOrder: readonly number[]): number[] {
  const displayCounts = new Array(counts.length).fill(0);
  for (let position = 0; position < counts.length; position++) {
    const displayIndex = bestOrder[position];
    displayCounts[displayIndex] = counts[position];
  }
  return displayCounts;
}

/**
 * Validate that counts respect the best-to-worst ranking.
 * bestOrder[0] is best, bestOrder[1] is second best, etc.
 * So counts at bestOrder[0] >= counts at bestOrder[1] >= ...
 */
export function validateRanking(counts: number[], bestOrder: readonly number[]): boolean {
  for (let i = 0; i < bestOrder.length - 1; i++) {
    const betterIdx = bestOrder[i];
    const worseIdx = bestOrder[i + 1];
    if (counts[betterIdx] < counts[worseIdx]) {
      return false;
    }
  }
  return true;
}

/**
 * Main generation function for a single question.
 * Returns counts in display order and derived percentages.
 */
export function generateQuestionCounts(params: GenerationParams): GenerationResult {
  const { respondentCount, question, rng } = params;
  const optionCount = question.options.length;
  
  // Generate weights in best-to-worst order
  const orderedWeights = generateOrderedWeights(rng, optionCount);
  
  // Normalize weights to sum to 1
  const weightSum = orderedWeights.reduce((a, b) => a + b, 0);
  const normalizedWeights = orderedWeights.map(w => w / weightSum);
  
  // Allocate integer counts
  let counts = allocateCounts(normalizedWeights, respondentCount);
  
  // Map to display order
  counts = mapToDisplayOrder(counts, question.bestOrder);
  
  // Validate ranking (should always pass with our generation)
  if (!validateRanking(counts, question.bestOrder)) {
    // If somehow violated, enforce by sorting in best-to-worst order and remapping
    const sortedCounts = [...counts].sort((a, b) => b - a);
    counts = mapToDisplayOrder(sortedCounts, question.bestOrder);
  }
  
  // Calculate percentages
  const percentages = counts.map(c => Math.round((c / respondentCount) * 1000) / 10);
  
  // Ensure percentages sum to 100.0 (adjust largest remainder)
  const pctSum = percentages.reduce((a, b) => a + b, 0);
  if (Math.abs(pctSum - 100) > 0.1) {
    const diff = 100 - pctSum;
    // Add difference to the largest category
    const maxIdx = counts.indexOf(Math.max(...counts));
    percentages[maxIdx] = Math.round((percentages[maxIdx] + diff) * 10) / 10;
  }
  
  return { counts, percentages };
}

/**
 * Generate respondent count for a report (deterministic from seed).
 */
export function generateRespondentCount(rng: SeededRandom, min: number, max: number): number {
  return rng.nextInt(max - min + 1) + min;
}