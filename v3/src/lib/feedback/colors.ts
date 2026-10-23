/**
 * Quality-based semantic color palettes for academic feedback charts.
 * Pure utility module with zero server-only dependencies (safe for client and server).
 */

// 3-option: Best (Blue), Medium (Amber), Worst (Red)
export const PALETTE_3 = ['#2563EB', '#D97706', '#DC2626'] as const;

// 4-option: Best (Blue), Second (Teal), Third (Amber), Worst (Red)
export const PALETTE_4 = ['#2563EB', '#0D9488', '#D97706', '#DC2626'] as const;

/**
 * Returns the semantic quality color for an option based on its quality rank.
 * @param qualityRank 0 = best, 1 = second best, 2 = third best, 3 = worst
 * @param totalOptions 3 or 4
 */
export function getQualityColor(qualityRank: number, totalOptions: number): string {
  if (totalOptions === 3) {
    return PALETTE_3[Math.min(qualityRank, 2)];
  }
  return PALETTE_4[Math.min(qualityRank, 3)];
}
