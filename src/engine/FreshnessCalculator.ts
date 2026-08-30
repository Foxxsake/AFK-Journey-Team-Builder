import type { FreshnessCategory } from '@/types';

/**
 * Freshness calculator — determines how current a data record is
 * based on its retrievedAt timestamp.
 *
 * Categories:
 *   current     — within 7 days
 *   recent      — within 30 days
 *   stale       — within 90 days
 *   very_stale  — older than 90 days
 *
 * Old data is NOT deleted — it can still be useful for comparison
 * and history. Stale data simply receives a reduced weight in
 * consensus calculations.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateFreshness(retrievedAt: string, now?: Date): FreshnessCategory {
  const referenceDate = now ?? new Date();
  const retrievedDate = new Date(retrievedAt);

  if (isNaN(retrievedDate.getTime())) return 'very_stale';

  const ageDays = (referenceDate.getTime() - retrievedDate.getTime()) / DAY_MS;

  if (ageDays <= 7) return 'current';
  if (ageDays <= 30) return 'recent';
  if (ageDays <= 90) return 'stale';
  return 'very_stale';
}

/**
 * Converts a freshness category to a 0–1 weight multiplier.
 * Fresher data gets a higher multiplier.
 */
export function freshnessWeight(category: FreshnessCategory): number {
  switch (category) {
    case 'current':
      return 1.0;
    case 'recent':
      return 0.8;
    case 'stale':
      return 0.5;
    case 'very_stale':
      return 0.25;
  }
}

/**
 * Human-readable label for a freshness category.
 */
export function freshnessLabel(category: FreshnessCategory): string {
  switch (category) {
    case 'current':
      return 'Current';
    case 'recent':
      return 'Recent';
    case 'stale':
      return 'Stale';
    case 'very_stale':
      return 'Very stale';
  }
}

/**
 * Relative time label (e.g. "2 days ago", "3 months ago").
 */
export function relativeTime(retrievedAt: string, now?: Date): string {
  const referenceDate = now ?? new Date();
  const retrievedDate = new Date(retrievedAt);

  if (isNaN(retrievedDate.getTime())) return 'unknown';

  const ageDays = Math.floor((referenceDate.getTime() - retrievedDate.getTime()) / DAY_MS);

  if (ageDays <= 0) return 'today';
  if (ageDays === 1) return '1 day ago';
  if (ageDays < 7) return `${ageDays} days ago`;
  if (ageDays < 14) return '1 week ago';
  if (ageDays < 30) return `${Math.floor(ageDays / 7)} weeks ago`;
  if (ageDays < 60) return '1 month ago';
  if (ageDays < 365) return `${Math.floor(ageDays / 30)} months ago`;
  return `${Math.floor(ageDays / 365)} year(s) ago`;
}
