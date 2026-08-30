import { useMemo } from 'react';
import { X, MapPin, BarChart3 } from 'lucide-react';
import type { Formation, PositionedHero, PlayerHero } from '@/types';
import { CLASS_LABELS, ROLE_LABELS, RARITY_LABELS, RARITY_COLORS, FACTION_LABELS, FACTION_COLORS } from '@/utils/labels';
import { gradeFromScore } from '@/engine/TeamScorer';

interface PositionExplanationProps {
  positionedHero: PositionedHero;
  formation: Formation;
  positionScores: Record<string, Record<string, number>>;
  allHeroes: PlayerHero[];
  onClose: () => void;
}

export function PositionExplanation({
  positionedHero,
  formation,
  positionScores,
  allHeroes,
  onClose,
}: PositionExplanationProps) {
  const hero = positionedHero.hero;

  // Build comparison: this hero's score in every slot
  const heroScores = useMemo(() => {
    const scores = formation.slots.map((slot) => ({
      slotId: slot.id,
      position: slot.position,
      frontBack: slot.frontBack,
      roleHint: slot.roleHint,
      score: positionScores[hero.id]?.[slot.id] ?? 0,
      isCurrent: slot.id === positionedHero.slotId,
    }));
    return scores.sort((a, b) => b.score - a.score);
  }, [formation, positionScores, hero.id, positionedHero.slotId]);

  const bestSlot = heroScores[0];
  const worstSlot = heroScores[heroScores.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-700/50 bg-slate-900 p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Why this position?</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hero info */}
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700/40 to-slate-800/40 border border-slate-700/50">
            <span className="text-lg font-black text-slate-300">{hero.name.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">{hero.name}</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              <span className={`rounded px-1 py-0.5 text-[8px] font-bold ${RARITY_COLORS[hero.rarity]}`}>
                {RARITY_LABELS[hero.rarity]}
              </span>
              <span className="text-[9px] text-slate-500">{CLASS_LABELS[hero.class]}</span>
              <span className={`rounded px-1 py-0.5 text-[8px] font-medium ${FACTION_COLORS[hero.faction] ?? ''}`}>
                {FACTION_LABELS[hero.faction] ?? hero.faction}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-amber-400">{positionedHero.positionScore}</div>
            <div className="text-[8px] text-slate-500">Position Score</div>
          </div>
        </div>

        {/* Current position */}
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5">
          <MapPin size={14} className="text-amber-400 shrink-0" />
          <span className="text-xs text-amber-200">
            Placed in Position {positionedHero.position} ({formation.slots.find(s => s.id === positionedHero.slotId)?.frontBack === 'front' ? 'Frontline' : 'Backline'})
          </span>
        </div>

        {/* Explanation */}
        <div className="mb-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Reasoning
          </h4>
          <p className="text-xs leading-relaxed text-slate-300">
            {positionedHero.positionExplanation || 'No specific positional reasoning available for this hero.'}
          </p>
        </div>

        {/* Data note — heuristic scoring disclaimer */}
        <div className="mb-4 rounded-lg bg-amber-500/5 border border-amber-500/15 p-2.5">
          <p className="text-[10px] leading-relaxed text-amber-200/60">
            <span className="font-bold text-amber-400/80">Heuristic scoring</span> — Position scores are based on hero class, range, and survivability estimates. These are mathematical assumptions, NOT verified AFK Journey positional mechanics. No skill-level positional data exists in the current dataset.
          </p>
        </div>

        {/* Position comparison */}
        <div className="mb-2">
          <div className="mb-2 flex items-center gap-2">
            <BarChart3 size={14} className="text-slate-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Position Comparison
            </h4>
          </div>

          <div className="flex flex-col gap-1.5">
            {heroScores.map((slot) => (
              <div
                key={slot.slotId}
                className={`flex items-center gap-2 rounded-lg p-2 ${
                  slot.isCurrent
                    ? 'bg-amber-500/10 border border-amber-500/30'
                    : 'bg-slate-800/30'
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-700/50 text-[10px] font-bold text-slate-300">
                  {slot.position}
                </span>
                <span className="flex-1 text-[10px] text-slate-400">
                  {slot.frontBack === 'front' ? 'Front' : 'Back'}
                  {slot.roleHint ? ` · ${ROLE_LABELS[slot.roleHint]}` : ''}
                </span>
                {/* Score bar */}
                <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-700/50">
                  <div
                    className={`h-full rounded-full ${
                      slot.score >= 70 ? 'bg-emerald-500' : slot.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${slot.score}%` }}
                  />
                </div>
                <span className={`w-7 text-right text-[10px] font-bold ${slot.isCurrent ? 'text-amber-400' : 'text-slate-400'}`}>
                  {slot.score}
                </span>
                {slot.isCurrent && (
                  <span className="text-[8px] font-bold uppercase text-amber-400">Now</span>
                )}
              </div>
            ))}
          </div>

          {bestSlot && worstSlot && bestSlot.score !== worstSlot.score && (
            <p className="mt-2 text-[10px] text-slate-500">
              Best slot: Position {bestSlot.position} ({bestSlot.score}) · Worst: Position {worstSlot.position} ({worstSlot.score})
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
