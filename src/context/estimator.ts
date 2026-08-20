export interface ContextTokenEstimator {
  estimate(content: string): number;
}

export class CharacterTokenEstimator implements ContextTokenEstimator {
  estimate(content: string): number {
    return Math.max(1, Math.ceil(content.length / 4));
  }
}
