/**
 * Intelligence Validation — validates verified data integrity.
 *
 * Ensures:
 *   1. Every verified ability has provenance (source, evidence, retrievedAt)
 *   2. Every verified record has a valid canonical hero ID
 *   3. Duplicate abilities are detected and rejected
 *   4. Duplicate hero/mode assessments are detected
 *   5. Counter relationships reference valid heroes
 *   6. Synergy relationships reference valid heroes
 *   7. Evidence type cannot be upgraded from heuristic to verified improperly
 *   8. Unknown data remains distinguishable from verified data
 */

import type {
  HeroAbility,
  HeroModeAssessment,
  CounterRelationship,
  SynergyRelationship,
  EvidenceType,
} from '@/types/intelligence';
import { heroesById } from '@/data/heroes';
import { EVIDENCE_RANK } from '@/types/intelligence';

export interface ValidationIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

function isValidHeroId(heroId: string): boolean {
  return !!heroesById[heroId];
}

function hasProvenance(ability: HeroAbility): boolean {
  return !!(ability.source && ability.evidence && ability.retrievedAt && ability.confidence);
}

function isValidEvidenceType(evidence: string): boolean {
  return (
    evidence === 'official' ||
    evidence === 'structured_source' ||
    evidence === 'verified_manual' ||
    evidence === 'verified' ||
    evidence === 'heuristic'
  );
}

// ============================================================
// ABILITY VALIDATION
// ============================================================

export function validateAbilities(abilities: HeroAbility[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();

  for (const ab of abilities) {
    // Check valid hero ID
    if (!ab.heroId || !isValidHeroId(ab.heroId)) {
      issues.push({
        level: 'error',
        code: 'INVALID_HERO_ID',
        message: `Ability ${ab.abilityId} references unknown hero: ${ab.heroId}`,
        field: 'heroId',
      });
      continue;
    }

    // Check provenance
    if (!hasProvenance(ab)) {
      issues.push({
        level: 'error',
        code: 'MISSING_PROVENANCE',
        message: `Ability ${ab.abilityId} for ${ab.heroId} is missing provenance (source, evidence, retrievedAt, or confidence)`,
        field: 'provenance',
      });
    }

    // Check valid evidence type
    if (!isValidEvidenceType(ab.evidence)) {
      issues.push({
        level: 'error',
        code: 'INVALID_EVIDENCE_TYPE',
        message: `Ability ${ab.abilityId} has invalid evidence type: ${ab.evidence}`,
        field: 'evidence',
      });
    }

    // Check for duplicate ability IDs
    if (seenIds.has(ab.abilityId)) {
      issues.push({
        level: 'error',
        code: 'DUPLICATE_ABILITY_ID',
        message: `Duplicate ability ID: ${ab.abilityId}`,
        field: 'abilityId',
      });
    } else {
      seenIds.add(ab.abilityId);
    }

    // Warning: heuristic evidence on an ability is suspicious
    if (ab.evidence === 'heuristic') {
      issues.push({
        level: 'warning',
        code: 'HEURISTIC_ABILITY',
        message: `Ability ${ab.abilityId} is marked heuristic — abilities should not be guessed`,
        field: 'evidence',
      });
    }
  }

  return buildResult(issues);
}

// ============================================================
// MODE ASSESSMENT VALIDATION
// ============================================================

export function validateModeAssessments(assessments: HeroModeAssessment[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  const seenKeys = new Set<string>();

  for (const a of assessments) {
    if (!a.heroId || !isValidHeroId(a.heroId)) {
      issues.push({
        level: 'error',
        code: 'INVALID_HERO_ID',
        message: `Mode assessment references unknown hero: ${a.heroId}`,
        field: 'heroId',
      });
      continue;
    }

    const key = `${a.heroId}::${a.mode}`;
    if (seenKeys.has(key)) {
      issues.push({
        level: 'error',
        code: 'DUPLICATE_MODE_ASSESSMENT',
        message: `Duplicate mode assessment for ${a.heroId} in ${a.mode}`,
        field: 'mode',
      });
    } else {
      seenKeys.add(key);
    }

    if (!isValidEvidenceType(a.evidence)) {
      issues.push({
        level: 'error',
        code: 'INVALID_EVIDENCE_TYPE',
        message: `Mode assessment for ${a.heroId} has invalid evidence: ${a.evidence}`,
        field: 'evidence',
      });
    }

    if (a.rating !== null && (a.rating < 0 || a.rating > 100)) {
      issues.push({
        level: 'error',
        code: 'INVALID_RATING',
        message: `Mode assessment for ${a.heroId} has invalid rating: ${a.rating}`,
        field: 'rating',
      });
    }
  }

  return buildResult(issues);
}

// ============================================================
// COUNTER VALIDATION
// ============================================================

export function validateCounters(counters: CounterRelationship[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const c of counters) {
    if (!c.heroId || !isValidHeroId(c.heroId)) {
      issues.push({
        level: 'error',
        code: 'INVALID_HERO_ID',
        message: `Counter references unknown attacking hero: ${c.heroId}`,
        field: 'heroId',
      });
    }

    if (c.counterHeroId !== '*' && (!c.counterHeroId || !isValidHeroId(c.counterHeroId))) {
      issues.push({
        level: 'error',
        code: 'INVALID_HERO_ID',
        message: `Counter references unknown target hero: ${c.counterHeroId}`,
        field: 'counterHeroId',
      });
    }

    if (!isValidEvidenceType(c.evidence)) {
      issues.push({
        level: 'error',
        code: 'INVALID_EVIDENCE_TYPE',
        message: `Counter has invalid evidence: ${c.evidence}`,
        field: 'evidence',
      });
    }
  }

  return buildResult(issues);
}

// ============================================================
// SYNERGY VALIDATION
// ============================================================

export function validateSynergies(synergies: SynergyRelationship[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const s of synergies) {
    if (!s.heroA || !isValidHeroId(s.heroA)) {
      issues.push({
        level: 'error',
        code: 'INVALID_HERO_ID',
        message: `Synergy references unknown hero A: ${s.heroA}`,
        field: 'heroA',
      });
    }

    if (!s.heroB || !isValidHeroId(s.heroB)) {
      issues.push({
        level: 'error',
        code: 'INVALID_HERO_ID',
        message: `Synergy references unknown hero B: ${s.heroB}`,
        field: 'heroB',
      });
    }

    if (!isValidEvidenceType(s.evidence)) {
      issues.push({
        level: 'error',
        code: 'INVALID_EVIDENCE_TYPE',
        message: `Synergy has invalid evidence: ${s.evidence}`,
        field: 'evidence',
      });
    }
  }

  return buildResult(issues);
}

// ============================================================
// EVIDENCE PRECEDENCE CHECK
// ============================================================

/**
 * Determines whether new evidence can replace existing evidence.
 * Stronger evidence can replace weaker evidence.
 * Weaker evidence CANNOT replace stronger evidence.
 * Equal evidence can update (replace) existing.
 */
export function canReplaceEvidence(
  existing: EvidenceType,
  incoming: EvidenceType,
): boolean {
  return EVIDENCE_RANK[incoming] >= EVIDENCE_RANK[existing];
}

/**
 * Merge two evidence values — returns the stronger one.
 */
export function mergeEvidence(
  existing: EvidenceType,
  incoming: EvidenceType,
): EvidenceType {
  return EVIDENCE_RANK[incoming] > EVIDENCE_RANK[existing] ? incoming : existing;
}

// ============================================================
// FULL VALIDATION
// ============================================================

export function validateAll(
  abilities: HeroAbility[],
  assessments: HeroModeAssessment[],
  counters: CounterRelationship[],
  synergies: SynergyRelationship[],
): ValidationResult {
  const allIssues: ValidationIssue[] = [];

  const abResult = validateAbilities(abilities);
  const maResult = validateModeAssessments(assessments);
  const coResult = validateCounters(counters);
  const syResult = validateSynergies(synergies);

  allIssues.push(...abResult.issues, ...maResult.issues, ...coResult.issues, ...syResult.issues);

  return buildResult(allIssues);
}

// ============================================================
// HELPER
// ============================================================

function buildResult(issues: ValidationIssue[]): ValidationResult {
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');
  return {
    valid: errors.length === 0,
    issues,
    errors,
    warnings,
  };
}
