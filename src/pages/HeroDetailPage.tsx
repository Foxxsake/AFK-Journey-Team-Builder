import { ArrowLeft, Swords, Shield, Eye, Link2, Target, BookOpen, ChevronRight, TrendingUp, Brain, Zap, Heart, Wand2, Activity } from 'lucide-react';
import { heroesById } from '@/data/heroes';
import { factionsById } from '@/data/factions';
import { gameModes } from '@/data/modes';
import { dataIntelligenceService } from '@/services/DataIntelligenceService';
import { SOURCE_REGISTRY } from '@/data/sources';
import { getHeroIntelligence } from '@/data/intelligence';
import { getHeroSynergies, getVerifiedSynergies, getHeuristicSynergies, getAntiSynergies } from '@/engine/SynergyEngine';
import { getHeroAbilities, getVerifiedHeroData } from '@/data/intelligence/verifiedAbilities';
import { getCounterResult } from '@/engine/CounterEngine';
import { getModeAssessment } from '@/data/intelligence/modeIntelligence';
import { HeroPortrait } from '@/components/HeroPortrait';
import {
  FACTION_LABELS,
  CLASS_LABELS,
  ROLE_LABELS,
  RARITY_LABELS,
  DAMAGE_TYPE_LABELS,
  RARITY_COLORS,
  FACTION_COLORS,
  CONFIDENCE_LABELS,
  CONFIDENCE_COLORS,
} from '@/utils/labels';
import type { LucideIcon } from 'lucide-react';

interface HeroDetailPageProps {
  heroId: string;
  onBack: () => void;
}

export function HeroDetailPage({ heroId, onBack }: HeroDetailPageProps) {
  const hero = heroesById[heroId];

  if (!hero) {
    return (
      <div className="fade-in flex flex-col items-center gap-4 px-5 pt-20">
        <p className="text-sm text-slate-400">Hero not found.</p>
        <button onClick={onBack} className="btn-secondary px-4 py-2 text-sm font-medium">
          Back to Database
        </button>
      </div>
    );
  }

  const faction = factionsById[hero.faction];
  const hasSkills = hero.skills && hero.skills.length > 0;
  const hasSynergies = hero.synergies && hero.synergies.length > 0;
  const hasCounters = hero.counters && hero.counters.length > 0;
  const hasModeRatings = hero.modeRatings && hero.modeRatings.length > 0;
  const intelligence = getHeroIntelligence(hero.id);
  const engineSynergies = getHeroSynergies(hero.id);
  const verifiedSyns = engineSynergies.filter((s) => s.evidence === 'verified');
  const heuristicSyns = engineSynergies.filter((s) => s.evidence === 'heuristic');
  const antiSyns = engineSynergies.filter((s) => s.synergyScore < 0);
  const verifiedData = getVerifiedHeroData(hero.id);
  const heroAbilities = getHeroAbilities(hero.id);
  const counterResult = getCounterResult(hero.id);

  return (
    <div className="fade-in flex flex-col gap-4 px-5 pb-6 pt-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-200"
      >
        <ArrowLeft size={18} />
        Hero Database
      </button>

      {/* Hero header */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <HeroPortrait hero={hero} size="xl" priority />
          <div className="flex flex-1 flex-col">
            <h1 className="text-xl font-bold text-white">{hero.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${FACTION_COLORS[hero.faction] ?? ''}`}>
                {FACTION_LABELS[hero.faction]}
              </span>
              <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${RARITY_COLORS[hero.rarity]}`}>
                {RARITY_LABELS[hero.rarity]}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
              <span>{CLASS_LABELS[hero.class]}</span>
              <span>·</span>
              <span>{DAMAGE_TYPE_LABELS[hero.damageType]}</span>
              <span>·</span>
              <span>Range {hero.range}</span>
            </div>
          </div>
        </div>

        {/* Roles */}
        <div className="mt-4">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Roles</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {hero.roles.length > 0 ? (
              hero.roles.map((role) => (
                <span key={role} className="rounded-lg border border-slate-700 bg-slate-800/40 px-2.5 py-1 text-xs font-medium text-slate-300">
                  {ROLE_LABELS[role]}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-600">Not yet assigned</span>
            )}
          </div>
        </div>

        {/* Description */}
        {hero.description && (
          <p className="mt-4 text-sm leading-relaxed text-slate-400">{hero.description}</p>
        )}

        {/* Release info */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <InfoRow label="Released" value={hero.releaseDate ?? 'Unknown'} />
          <InfoRow label="Version" value={hero.releaseVersion ?? 'Unknown'} />
        </div>
      </div>

      {/* Faction info */}
      {faction && (
        <Section icon={Shield} title="Faction">
          <p className="text-sm font-semibold text-slate-200">{faction.name}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{faction.description}</p>
        </Section>
      )}

      {/* Hero Intelligence */}
      {intelligence && (
        <Section icon={Brain} title="Hero Intelligence">
          <div className="space-y-3">
            {/* Roles */}
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Combat Roles</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {intelligence.roles.length > 0 ? (
                  intelligence.roles.map((r, i) => (
                    <span key={i} className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                      r.evidence === 'verified' ? 'border-emerald-700/40 bg-emerald-950/20 text-emerald-300'
                      : 'border-slate-700 bg-slate-800/40 text-slate-300'
                    }`}>
                      {r.role.replace('_', ' ')}
                      <span className="ml-1 text-[9px] opacity-60">{r.evidence === 'verified' ? 'VERIFIED' : 'HEURISTIC'}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-600">UNKNOWN</span>
                )}
              </div>
            </div>

            {/* Combat Functions */}
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Combat Functions</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {intelligence.functions.length > 0 ? (
                  intelligence.functions.map((f, i) => (
                    <span key={i} className="rounded-md border border-slate-700/50 bg-slate-800/30 px-2 py-0.5 text-[10px] text-slate-400">
                      {f.func.replace(/_/g, ' ')}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-600">UNKNOWN</span>
                )}
              </div>
            </div>

            {/* Capabilities */}
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Capabilities</span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {Object.entries(intelligence.capabilities.capabilities).map(([key, val]) => (
                  <div key={key} className="flex flex-col items-center rounded-lg bg-slate-800/30 py-1.5">
                    <span className="text-[10px] capitalize text-slate-500">{key.replace(/_/g, ' ')}</span>
                    <div className="mt-0.5 flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < val ? 'bg-sky-400' : 'bg-slate-700'}`} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            {intelligence.weaknesses.length > 0 && (
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Potential Weaknesses</span>
                <ul className="mt-1.5 space-y-1">
                  {intelligence.weaknesses.map((w, i) => (
                    <li key={i} className="text-xs text-amber-400/70">• {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Data transparency */}
            <div className="flex items-center gap-2 rounded-lg bg-slate-800/20 p-2">
              <span className={`text-[10px] font-semibold ${
                intelligence.completeness === 'full' ? 'text-emerald-400' :
                intelligence.completeness === 'partial' ? 'text-amber-400' : 'text-slate-500'
              }`}>
                {intelligence.completeness.toUpperCase()} · {intelligence.capabilities.evidence.toUpperCase()}
              </span>
              <span className="text-[10px] text-slate-600">Assessed {intelligence.lastAssessed}</span>
            </div>
          </div>
        </Section>
      )}

      {/* Engine Synergies */}
      {engineSynergies.length > 0 && (
        <Section icon={Link2} title="Synergy Relationships">
          <div className="space-y-3">
            {/* Verified synergies */}
            {verifiedSyns.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-sky-400/80">Verified Synergies</span>
                <div className="mt-1.5 space-y-2">
                  {verifiedSyns.slice(0, 6).map((syn, i) => {
                    const partnerId = syn.heroA === hero.id ? syn.heroB : syn.heroA;
                    const partner = heroesById[partnerId];
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-xl border border-sky-700/30 bg-sky-950/10 p-3">
                        <HeroPortrait heroId={partnerId} hero={partner} size="sm" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-200">{partner?.name ?? partnerId}</span>
                            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                              {syn.synergyScore > 0 ? '+' : ''}{syn.synergyScore}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{syn.reason}</p>
                          <span className="text-[9px] text-sky-400/60">STRUCTURED SOURCE · {syn.category.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Heuristic synergies */}
            {heuristicSyns.filter((s) => s.synergyScore > 0).length > 0 && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-400/70">Heuristic Synergies</span>
                <div className="mt-1.5 space-y-2">
                  {heuristicSyns.filter((s) => s.synergyScore > 0).slice(0, 4).map((syn, i) => {
                    const partnerId = syn.heroA === hero.id ? syn.heroB : syn.heroA;
                    const partner = heroesById[partnerId];
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/30 p-3">
                        <HeroPortrait heroId={partnerId} hero={partner} size="sm" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-200">{partner?.name ?? partnerId}</span>
                            <span className="rounded bg-slate-600/30 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">
                              +{syn.synergyScore}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{syn.reason}</p>
                          <span className="text-[9px] text-amber-400/50">HEURISTIC · {syn.category.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Anti-synergies */}
            {antiSyns.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-rose-400/70">Anti-Synergies</span>
                <div className="mt-1.5 space-y-2">
                  {antiSyns.slice(0, 4).map((syn, i) => {
                    const partnerId = syn.heroA === hero.id ? syn.heroB : syn.heroA;
                    const partner = heroesById[partnerId];
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-xl border border-rose-800/30 bg-rose-950/10 p-3">
                        <HeroPortrait heroId={partnerId} hero={partner} size="sm" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-200">{partner?.name ?? partnerId}</span>
                            <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
                              {syn.synergyScore}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{syn.reason}</p>
                          <span className="text-[9px] text-slate-600">{syn.evidence.toUpperCase()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Skills */}
      <Section icon={Swords} title="Skills">
        {hasSkills ? (
          <div className="space-y-3">
            {hero.skills!.map((skill) => (
              <div key={skill.id} className="rounded-xl border border-slate-700/60 bg-slate-800/30 p-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{skill.name}</h4>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                    skill.type === 'ultimate' ? 'bg-amber-500/15 text-amber-400' :
                    skill.type === 'active' ? 'bg-sky-500/15 text-sky-400' :
                    'bg-slate-600/30 text-slate-400'
                  }`}>
                    {skill.type}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{skill.description}</p>
                {skill.effects && skill.effects.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {skill.effects.map((eff, i) => (
                      <li key={i} className="text-xs text-slate-500">• {eff.description}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 flex gap-3 text-[11px] text-slate-500">
                  {skill.cooldown !== undefined && <span>CD: {skill.cooldown}s</span>}
                  {skill.energyCost !== undefined && <span>Energy: {skill.energyCost}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptySection text="Skill data not yet verified. Skills will be populated from individual hero wiki pages." />
        )}
      </Section>

      {/* Synergies */}
      <Section icon={Link2} title="Synergies">
        {hasSynergies ? (
          <div className="space-y-2">
            {hero.synergies!.map((syn, i) => {
              const synHero = heroesById[syn.heroId];
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/30 p-3">
                  <HeroPortrait heroId={syn.heroId} hero={synHero} size="sm" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-200">{synHero?.name ?? syn.heroId}</span>
                    <p className="text-xs text-slate-500">{syn.reason}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptySection text="Synergy data not yet available. Synergies will be determined through gameplay analysis." />
        )}
      </Section>

      {/* Counters */}
      <Section icon={Target} title="Counters">
        {hasCounters ? (
          <div className="space-y-2">
            {hero.counters!.map((cnt, i) => {
              const cntHero = heroesById[cnt.heroId];
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/30 p-3">
                  <HeroPortrait heroId={cnt.heroId} hero={cntHero} size="sm" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-200">{cntHero?.name ?? cnt.heroId}</span>
                    <p className="text-xs text-slate-500">{cnt.reason}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptySection text="Counter data not yet available. Counters will be determined through gameplay analysis." />
        )}
      </Section>

      {/* Verified Abilities */}
      <Section icon={Zap} title="Abilities">
        {heroAbilities.length > 0 ? (
          <div className="space-y-3">
            {heroAbilities.map((ab) => (
              <div key={ab.abilityId} className="rounded-xl border border-slate-700/60 bg-slate-800/30 p-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{ab.name}</h4>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                    ab.abilityType === 'ultimate' ? 'bg-amber-500/15 text-amber-400' :
                    ab.abilityType === 'active' ? 'bg-sky-500/15 text-sky-400' :
                    'bg-slate-600/30 text-slate-400'
                  }`}>
                    {ab.abilityType}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{ab.description}</p>
                {ab.effects.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ab.effects.map((eff, i) => (
                      <span key={i} className="rounded-md border border-slate-700/50 bg-slate-800/40 px-2 py-0.5 text-[10px] text-slate-400">
                        {eff.type.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2 text-[10px]">
                  <span className={`font-semibold ${
                    ab.evidence === 'official' ? 'text-emerald-400' :
                    ab.evidence === 'structured_source' ? 'text-sky-400' :
                    ab.evidence === 'verified_manual' ? 'text-teal-400' :
                    'text-amber-400'
                  }`}>
                    {ab.evidence.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span className="text-slate-600">· {ab.source}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptySection text="No verified ability data yet. Abilities will be populated from reliable community sources." />
        )}
      </Section>

      {/* Counter Engine Results */}
      <Section icon={Target} title="Counter Analysis">
        {counterResult.strongAgainst.length > 0 || counterResult.weakAgainst.length > 0 ? (
          <div className="space-y-2">
            {counterResult.strongAgainst.length > 0 && (
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-400/70">Strong Against</span>
                <div className="mt-1 space-y-1">
                  {counterResult.strongAgainst.map((c, i) => {
                    const targetHero = heroesById[c.counterHeroId];
                    return (
                      <div key={i} className="text-xs text-slate-400">
                        <span className="font-medium text-slate-300">{c.strength}</span> · {targetHero?.name ?? c.counterHeroId} · {c.category.replace(/_/g, ' ')}
                        <p className="text-slate-500">{c.reason}</p>
                        <span className="text-[9px] text-sky-400/50">{c.evidence.replace(/_/g, ' ').toUpperCase()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {counterResult.weakAgainst.length > 0 && (
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wide text-rose-400/70">Weak Against</span>
                <div className="mt-1 space-y-1">
                  {counterResult.weakAgainst.map((c, i) => {
                    const targetHero = heroesById[c.counterHeroId];
                    return (
                      <div key={i} className="text-xs text-slate-400">
                        <span className="font-medium text-slate-300">{targetHero?.name ?? c.counterHeroId}</span>
                        <p className="text-slate-500">{c.reason}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <span className="text-[10px] text-slate-600">{counterResult.confidence.toUpperCase()} confidence</span>
          </div>
        ) : (
          <EmptySection text="No counter data available. Counter relationships will be established from verified ability analysis." />
        )}
      </Section>

      {/* Mode Performance */}
      <Section icon={Activity} title="Mode Performance">
        {(() => {
          const assessments = gameModes.map((m) => ({ mode: m, assessment: getModeAssessment(hero.id, m.id) }));
          const hasAny = assessments.some((a) => a.assessment !== null);
          if (!hasAny) {
            return <EmptySection text="No mode-specific assessments yet. Mode performance will be populated from verified tier data." />;
          }
          return (
            <div className="space-y-2">
              {assessments.map(({ mode, assessment }) => (
                <div key={mode.id} className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/30 px-3 py-2">
                  <span className="text-xs font-medium text-slate-200">{mode.name}</span>
                  {assessment ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-400">{assessment.rating}/100</span>
                      <span className={`text-[10px] ${
                        assessment.evidence === 'official' ? 'text-emerald-400' :
                        assessment.evidence === 'structured_source' ? 'text-sky-400' : 'text-amber-400'
                      }`}>
                        {assessment.evidence.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-600">UNKNOWN</span>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </Section>

      {/* Game Mode Ratings */}
      <Section icon={Eye} title="Game Mode Ratings">
        {hasModeRatings ? (
          <div className="space-y-2">
            {hero.modeRatings!.map((mr) => {
              const mode = gameModes.find((m) => m.id === mr.modeId);
              return (
                <div key={mr.modeId} className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-800/30 p-3">
                  <span className="text-sm font-medium text-slate-200">{mode?.name ?? mr.modeId}</span>
                  <div className="flex items-center gap-2">
                    {mr.tier && <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-400">{mr.tier}</span>}
                    {mr.rating !== undefined && <span className="text-xs text-slate-400">{mr.rating}/10</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptySection text="Mode-specific ratings not yet available. Ratings will be populated from verified tier list data." />
        )}
      </Section>

      {/* Meta Sources & Consensus */}
      <Section icon={TrendingUp} title="Meta Sources">
        {(() => {
          const records = dataIntelligenceService.getRecordsForHero(hero.id);
          if (records.length === 0) {
            return <EmptySection text="No meta ratings from external sources yet. Meta data is imported manually — no automated scraping." />;
          }
          return (
            <div className="space-y-3">
              {/* Per-source ratings */}
              {gameModes.map((mode) => {
                const modeRecords = records.filter((r) => r.modeId === mode.id);
                if (modeRecords.length === 0) return null;
                const consensus = dataIntelligenceService.getConsensus(hero.id, mode.id);
                return (
                  <div key={mode.id} className="rounded-xl border border-slate-700/60 bg-slate-800/30 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-200">{mode.name}</span>
                      {consensus && (
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-400">
                            {consensus.consensusTier}
                          </span>
                          <span className={`text-[10px] ${consensus.agreement === 'high' ? 'text-emerald-400' : consensus.agreement === 'medium' ? 'text-amber-400' : 'text-rose-400'}`}>
                            {consensus.agreement} agreement
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {modeRecords.map((r, i) => {
                        const source = SOURCE_REGISTRY.find((s) => s.id === r.sourceId);
                        const freshness = dataIntelligenceService.getFreshness(r.retrievedAt);
                        const freshnessLabelStr = dataIntelligenceService.freshnessLabel(freshness);
                        return (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-300">{source?.name ?? r.sourceId}</span>
                              {r.tier && <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] font-bold text-slate-200">{r.tier}</span>}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              <span>{freshnessLabelStr}</span>
                              <span>·</span>
                              <span>{dataIntelligenceService.relativeTime(r.retrievedAt)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {consensus && (
                      <div className="mt-2 flex items-center gap-2 border-t border-slate-700/40 pt-2">
                        <span className="text-[10px] text-slate-500">Consensus:</span>
                        <span className="text-xs font-bold text-amber-400">{consensus.consensusRating}/100</span>
                        <span className={`text-[10px] ${CONFIDENCE_COLORS[consensus.confidence]}`}>
                          {CONFIDENCE_LABELS[consensus.confidence]} confidence
                        </span>
                        {consensus.hasDisagreement && (
                          <span className="text-[10px] text-rose-400">⚠ Sources disagree</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex items-start gap-2 rounded-lg bg-slate-800/30 p-2.5">
                <span className="text-[10px] text-slate-500">
                  Meta ratings are imported from community sources. No automated scraping.
                  Consensus is calculated deterministically from source reliability, freshness, and agreement.
                </span>
              </div>
            </div>
          );
        })()}
      </Section>

      {/* Sources */}
      <Section icon={BookOpen} title="Sources">
        <div className="space-y-2">
          {hero.sources.map((src, i) => (
            <div key={i} className="rounded-xl border border-slate-700/60 bg-slate-800/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">{src.sourceName}</span>
                <span className={`text-xs font-semibold ${CONFIDENCE_COLORS[src.confidence]}`}>
                  {CONFIDENCE_LABELS[src.confidence]}
                </span>
              </div>
              {src.url && (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
                >
                  <span className="truncate">{src.url}</span>
                  <ChevronRight size={12} />
                </a>
              )}
              {src.lastUpdated && (
                <p className="mt-1 text-[11px] text-slate-600">Last updated: {src.lastUpdated}</p>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <Icon size={16} />
        {title}
      </h2>
      <div className="card p-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-600">{label}</p>
      <p className="text-sm text-slate-300">{value}</p>
    </div>
  );
}

function EmptySection({ text }: { text: string }) {
  return <p className="text-xs leading-relaxed text-slate-600">{text}</p>;
}
