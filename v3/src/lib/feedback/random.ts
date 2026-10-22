/**
 * Seeded pseudo-random number generator (Mulberry32).
 * Deterministic, fast, and suitable for reproducible generation.
 */

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  static fromString(str: string): SeededRandom {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = Math.imul(31, hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return new SeededRandom(hash);
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Generate a deterministic seed from a base seed and a context string.
 */
export function deriveSeed(baseSeed: string, context: string): string {
  let hash = 0;
  const combined = baseSeed + '|' + context;
  for (let i = 0; i < combined.length; i++) {
    hash = Math.imul(31, hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(16);
}

/**
 * Convert string seed to number for SeededRandom.
 */
export function seedToNumber(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(31, hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}