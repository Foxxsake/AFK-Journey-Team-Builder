import { useState, useMemo, useCallback } from 'react';
import {
  Wrench,
  Swords,
  Users,
  Shield,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Info,
  Layers,
  Zap,
  Target,
  Search,
  X,
  Flame,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GameMode, PlayerHero, EnemyTeam } from '@/types';
import { gameModes, gameModesById } from '@/data/modes';
import { getFormationsForMode, formationsById } from '@/data/formations';
import { getAllBossProfiles } from '@/data/intelligence/modeIntelligence';
import { heroes, heroesById } from '@/data/heroes';
import { useRoster } from '@/services/RosterStore';
import {
  optimizeMultipleTeams,
  optimizeFormation,
  TEAM_OPTIMIZER_CONFIG,
  scoreHeroInSlot,
  type OptimizerResult,
  type FormationResult,
  type PositionedHero,
  type OptimizerConfig,
} from '@/engine';
import { dataIntelligenceService } from '@/services/DataIntelligenceService';
import { gradeFromScore } from '@/engine/TeamScorer';
import { FormationBoard } from '@/components/FormationBoard';
import { PositionExplanation } from '@/components/PositionExplanation';
import { analyseEnemyTeam } from '@/engine/CounterEngine';
import { HeroPortrait } from '@/components/HeroPortrait';
import { CLASS_LABELS, RARITY_LABELS, RARITY_COLORS, FACTION_LABELS, FACTION_COLORS, CONFIDENCE_LABELS, CONFIDENCE_COLORS } from '@/utils/labels';

type BuildStep = 'config' | 'results';

export function BuildPage() {
  const { getAvailableHeroesForTeamBuilding } = useRoster();
  const [step, setStep] = useState<BuildStep>('config');

  // Config state
  const [selectedModeId, setSelectedModeId] = useState<string>('');
  const [selectedBossId, setSelectedBossId] = useState<string | null>(null);
  const [teamCount, setTeamCount] = useState(1);
  const [avoidHeroReuse, setAvoidHeroReuse] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [enemyHeroIds, setEnemyHeroIds] = useState<string[]>([]);
  const [showEnemyPicker, setShowEnemyPicker] = useState(false);

  // Results state
  const [optimizerResult, setOptimizerResult] = useState<OptimizerResult | null>(null);
  const [formationResults, setFormationResults] = useState<FormationResult[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);

  // UI state
  const [selectedTeamIdx, setSelectedTeamIdx] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<PositionedHero | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const ownedHeroes = getAvailableHeroesForTeamBuilding();
  const availableModes = gameModes;

  const enemyTeam: EnemyTeam | null = enemyHeroIds.length > 0 ? { heroes: enemyHeroIds } : null;

  const handleBuild = useCallback(() => {
    if (!selectedModeId || ownedHeroes.length === 0) return;
    setIsBuilding(true);

    const mode = gameModesById[selectedModeId];
    const config: OptimizerConfig = { ...TEAM_OPTIMIZER_CONFIG, debug: debugMode };

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      // Get meta consensus for this mode
      const allConsensus = dataIntelligenceService.getAllConsensus();
      const modeConsensus = new Map(
        allConsensus.filter(c => c.modeId === mode.id).map(c => [`${c.heroId}::${c.modeId}`, c])
      );

      const result = optimizeMultipleTeams(
        {
          playerHeroes: ownedHeroes,
          mode,
          teamCount,
          avoidHeroReuse,
          debug: debugMode,
          metaConsensus: modeConsensus,
          enemyTeam: enemyTeam ?? undefined,
          bossId: selectedBossId,
        },
        { config, metaConsensus: modeConsensus }
      );

      // Optimise formation for each team
      const fResults: FormationResult[] = [];
      for (const team of result.teams) {
        const fResult = optimizeFormation(
          {
            heroes: team.heroes,
            modeId: mode.id,
            teamScore: team.score,
            debug: debugMode,
          },
          config
        );
        fResults.push(fResult);
      }

      setOptimizerResult(result);
      setFormationResults(fResults);
      setSelectedTeamIdx(0);
      setSelectedSlot(null);
      setShowAlternatives(false);
      setIsBuilding(false);
      setStep('results');
    }, 50);
  }, [selectedModeId, selectedBossId, ownedHeroes, teamCount, avoidHeroReuse, debugMode, enemyTeam]);

  const handleBack = useCallback(() => {
    setStep('config');
    setOptimizerResult(null);
    setFormationResults([]);
    setSelectedSlot(null);
  }, []);

  const handleSwapPositions = useCallback((teamIdx: number, slotIdA: string, slotIdB: string) => {
    setFormationResults((prev) => {
      const copy = [...prev];
      const targetFormation = copy[teamIdx];
      if (!targetFormation) return prev;

      const posA = targetFormation.positions.find((p) => p.slotId === slotIdA);
      const posB = targetFormation.positions.find((p) => p.slotId === slotIdB);

      if (posA && posB) {
        const targetFormationData = formationsById[targetFormation.formationId];
        const slotAData = targetFormationData?.slots.find(s => s.id === slotIdA);
        const slotBData = targetFormationData?.slots.find(s => s.id === slotIdB);

        // Swap hero instances and slot attributes, and rescore
        const updatedPositions = targetFormation.positions.map((pos) => {
          if (pos.slotId === slotIdA) {
            const newHero = posB.hero;
            const newScore = slotAData ? scoreHeroInSlot(newHero, slotAData, TEAM_OPTIMIZER_CONFIG) : { total: posB.positionScore, reasons: [] };
            return {
              ...pos,
              hero: newHero,
              positionScore: newScore.total,
              reasons: [`Manually swapped from position ${posB.position}`, ...newScore.reasons],
            };
          }
          if (pos.slotId === slotIdB) {
            const newHero = posA.hero;
            const newScore = slotBData ? scoreHeroInSlot(newHero, slotBData, TEAM_OPTIMIZER_CONFIG) : { total: posA.positionScore, reasons: [] };
            return {
              ...pos,
              hero: newHero,
              positionScore: newScore.total,
              reasons: [`Manually swapped from position ${posA.position}`, ...newScore.reasons],
            };
          }
          return pos;
        });

        // Recalculate average formation score
        const totalScore = updatedPositions.reduce((sum, p) => sum + p.positionScore, 0);
        const avgScore = updatedPositions.length > 0 ? totalScore / updatedPositions.length : 0;

        copy[teamIdx] = {
          ...targetFormation,
          positions: updatedPositions,
          formationScore: avgScore,
        };
      }
      return copy;
    });
  }, []);

  if (step === 'config') {
    return (
      <BuildConfigStep
        ownedCount={ownedHeroes.length}
        selectedModeId={selectedModeId}
        selectedBossId={selectedBossId}
        onSelectMode={(modeId) => {
          setSelectedModeId(modeId);
          if (modeId !== 'dream_realm') setSelectedBossId(null);
        }}
        onSelectBoss={setSelectedBossId}
        teamCount={teamCount}
        onTeamCountChange={setTeamCount}
        avoidHeroReuse={avoidHeroReuse}
        onAvoidHeroReuseChange={setAvoidHeroReuse}
        debugMode={debugMode}
        onDebugModeChange={setDebugMode}
        onBuild={handleBuild}
        isBuilding={isBuilding}
        enemyHeroIds={enemyHeroIds}
        onEnemyHeroIdsChange={setEnemyHeroIds}
        showEnemyPicker={showEnemyPicker}
        onToggleEnemyPicker={() => setShowEnemyPicker(!showEnemyPicker)}
      />
    );
  }

  return (
    <BuildResultsStep
      result={optimizerResult}
      formationResults={formationResults}
      modeId={selectedModeId}
      selectedTeamIdx={selectedTeamIdx}
      onSelectTeam={setSelectedTeamIdx}
      onSlotClick={setSelectedSlot}
      selectedSlot={selectedSlot}
      onBack={handleBack}
      showAlternatives={showAlternatives}
      onToggleAlternatives={() => setShowAlternatives(!showAlternatives)}
      debugMode={debugMode}
      enemyTeam={enemyTeam}
      onSwapPositions={handleSwapPositions}
    />
  );
}

// ============================================================
// CONFIG STEP
// ============================================================

interface BuildConfigProps {
  ownedCount: number;
  selectedModeId: string;
  selectedBossId: string | null;
  onSelectMode: (id: string) => void;
  onSelectBoss: (id: string | null) => void;
  teamCount: number;
  onTeamCountChange: (n: number) => void;
  avoidHeroReuse: boolean;
  onAvoidHeroReuseChange: (v: boolean) => void;
  debugMode: boolean;
  onDebugModeChange: (v: boolean) => void;
  onBuild: () => void;
  isBuilding: boolean;
  enemyHeroIds: string[];
  onEnemyHeroIdsChange: (ids: string[]) => void;
  showEnemyPicker: boolean;
  onToggleEnemyPicker: () => void;
}

function BuildConfigStep({
  ownedCount,
  selectedModeId,
  selectedBossId,
  onSelectMode,
  onSelectBoss,
  teamCount,
  onTeamCountChange,
  avoidHeroReuse,
  onAvoidHeroReuseChange,
  debugMode,
  onDebugModeChange,
  onBuild,
  isBuilding,
  enemyHeroIds,
  onEnemyHeroIdsChange,
  showEnemyPicker,
  onToggleEnemyPicker,
}: BuildConfigProps) {
  const selectedMode = selectedModeId ? gameModesById[selectedModeId] : null;
  const formationsForMode = selectedModeId ? getFormationsForMode(selectedModeId) : [];
  const bossProfiles = getAllBossProfiles();

  const canBuild = selectedModeId && ownedCount >= 5 && !isBuilding;

  return (
    <div className="fade-in flex flex-col gap-4 px-5 pb-6 pt-8">
      <PageHeader icon={Wrench} title="Build Team" subtitle="Optimise teams with formation positions" />

      {/* Owned heroes status */}
      <div className="card flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/15">
          <Users size={18} className="text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{ownedCount} heroes owned</p>
          <p className="text-xs text-slate-500">
            {ownedCount < 5 ? 'Need at least 5 to build a team' : 'Ready to build'}
          </p>
        </div>
      </div>

      {/* Mode selection */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          1. Select Game Mode
        </h2>
        <div className="flex flex-col gap-2">
          {gameModes.map((mode) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              isSelected={selectedModeId === mode.id}
              onSelect={() => onSelectMode(mode.id)}
            />
          ))}
        </div>
      </section>

      {/* Boss selection for Dream Realm */}
      {selectedModeId === 'dream_realm' && (
        <section className="card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Flame size={15} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Target Dream Realm Boss</h3>
          </div>
          <p className="mb-3 text-xs text-slate-400">
            Select the active boss to tailor counter synergies and debuff requirements:
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              onClick={() => onSelectBoss(null)}
              className={`rounded-xl border p-2.5 text-left transition-all ${
                selectedBossId === null
                  ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500'
                  : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
              }`}
            >
              <span className="block text-xs font-bold text-slate-200">General Boss</span>
              <span className="text-[10px] text-slate-500">Universal DPS build</span>
            </button>
            {bossProfiles.map((boss) => {
              const isSelected = selectedBossId === boss.bossId;
              return (
                <button
                  key={boss.bossId}
                  onClick={() => onSelectBoss(boss.bossId)}
                  className={`rounded-xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500'
                      : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
                  }`}
                >
                  <span className="block truncate text-xs font-bold text-amber-300">
                    {boss.bossName}
                  </span>
                  <span className="text-[10px] capitalize text-slate-400">
                    {boss.damageType} dmg · {boss.targeting}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Formation info for selected mode */}
      {selectedMode && (
        <section className="card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Layers size={14} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Formations for {selectedMode.name}</h3>
          </div>
          {formationsForMode.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {formationsForMode.map((f) => (
                  <span
                    key={f.id}
                    className="rounded-lg border border-slate-700/50 bg-slate-800/30 px-2.5 py-1 text-xs text-slate-300"
                  >
                    {f.name}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-slate-500">
                  {formationsForMode.length} formation{formationsForMode.length > 1 ? 's' : ''} available
                </span>
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400/80">
                  PROVISIONAL
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${CONFIDENCE_COLORS[formationsForMode[0].confidence]}`}>
                  {CONFIDENCE_LABELS[formationsForMode[0].confidence]} confidence
                </span>
              </div>
            </>
          ) : (
            <p className="text-xs text-amber-400/80">
              Formation optimisation unavailable for this mode — no verified formation data.
            </p>
          )}
        </section>
      )}

      {/* Team count */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          2. Number of Teams
        </h2>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => onTeamCountChange(n)}
              className={`flex-1 rounded-xl border py-3 text-center text-sm font-bold transition-all ${
                teamCount === n
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : 'border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      {/* Hero reuse toggle */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          3. Hero Reuse
        </h2>
        <button
          onClick={() => onAvoidHeroReuseChange(!avoidHeroReuse)}
          className="card flex w-full items-center gap-3 p-4 text-left transition-colors hover:border-slate-600"
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
            avoidHeroReuse
              ? 'bg-emerald-500/10 border-emerald-500/15'
              : 'bg-amber-500/10 border-amber-500/15'
          }`}>
            <Shield size={18} className={avoidHeroReuse ? 'text-emerald-400' : 'text-amber-400'} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">
              {avoidHeroReuse ? 'No reuse (unique heroes)' : 'Allow reuse'}
            </p>
            <p className="text-xs text-slate-500">
              {avoidHeroReuse
                ? 'Each hero appears in only one team'
                : 'Same hero can appear in multiple teams'}
            </p>
          </div>
          <div className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
            avoidHeroReuse ? 'bg-emerald-500' : 'bg-slate-600'
          }`}>
            <div className={`h-5 w-5 rounded-full bg-white transition-transform ${
              avoidHeroReuse ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </div>
        </button>
      </section>

      {/* Debug toggle */}
      <section>
        <button
          onClick={() => onDebugModeChange(!debugMode)}
          className="card flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-slate-600"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/50">
            <Info size={14} className="text-slate-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-300">Debug mode</p>
            <p className="text-[10px] text-slate-500">Show formation scores, candidates, timing</p>
          </div>
          <div className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
            debugMode ? 'bg-amber-500' : 'bg-slate-600'
          }`}>
            <div className={`h-4 w-4 rounded-full bg-white transition-transform ${
              debugMode ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </div>
        </button>
      </section>

      {/* Enemy Team Selection */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Enemy Team (Optional)
        </h2>
        <button
          onClick={onToggleEnemyPicker}
          className="card flex w-full items-center gap-3 p-4 text-left transition-colors hover:border-slate-600"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/15">
            <Target size={18} className="text-rose-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">
              {enemyHeroIds.length > 0 ? `${enemyHeroIds.length} enemy heroes selected` : 'Select enemy team'}
            </p>
            <p className="text-xs text-slate-500">
              {enemyHeroIds.length > 0 ? 'Counter analysis will influence recommendations' : 'Counter scoring is neutral without an enemy team'}
            </p>
          </div>
          {enemyHeroIds.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onEnemyHeroIdsChange([]); }}
              className="rounded-lg bg-slate-800/50 p-1.5 text-slate-400 hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}
        </button>

        {showEnemyPicker && (
          <EnemyHeroPicker
            selectedIds={enemyHeroIds}
            onToggle={(id) => {
              if (enemyHeroIds.includes(id)) {
                onEnemyHeroIdsChange(enemyHeroIds.filter((x) => x !== id));
              } else if (enemyHeroIds.length < 5) {
                onEnemyHeroIdsChange([...enemyHeroIds, id]);
              }
            }}
            onClose={onToggleEnemyPicker}
          />
        )}

        {enemyHeroIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {enemyHeroIds.map((id) => {
              const h = heroesById[id];
              return (
                <span key={id} className="flex items-center gap-1.5 rounded-lg border border-rose-700/40 bg-rose-950/30 px-2 py-1 text-xs text-rose-300">
                  <HeroPortrait heroId={id} size="xs" />
                  <span>{h?.name ?? id}</span>
                </span>
              );
            })}
          </div>
        )}
      </section>

      {/* Build button */}
      <button
        onClick={onBuild}
        disabled={!canBuild}
        className={`flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold transition-all ${
          canBuild
            ? 'bg-amber-500 text-slate-900 hover:bg-amber-400 active:scale-[0.98]'
            : 'bg-slate-800 text-slate-600'
        }`}
      >
        {isBuilding ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Building...
          </>
        ) : (
          <>
            <Sparkles size={18} />
            Build My Teams
          </>
        )}
      </button>

      {ownedCount > 0 && (
        <p className="text-center text-xs text-slate-600">
          {heroes.length} heroes in database · {ownedCount} available
        </p>
      )}
    </div>
  );
}

// ============================================================
// RESULTS STEP
// ============================================================

interface BuildResultsProps {
  result: OptimizerResult | null;
  formationResults: FormationResult[];
  modeId: string;
  selectedTeamIdx: number;
  onSelectTeam: (idx: number) => void;
  onSlotClick: (ph: PositionedHero | null) => void;
  selectedSlot: PositionedHero | null;
  onBack: () => void;
  showAlternatives: boolean;
  onToggleAlternatives: () => void;
  debugMode: boolean;
  enemyTeam: EnemyTeam | null;
  onSwapPositions?: (teamIdx: number, slotIdA: string, slotIdB: string) => void;
}

function BuildResultsStep({
  result,
  formationResults,
  modeId,
  selectedTeamIdx,
  onSelectTeam,
  onSlotClick,
  selectedSlot,
  onBack,
  showAlternatives,
  onToggleAlternatives,
  debugMode,
  enemyTeam,
  onSwapPositions,
}: BuildResultsProps) {
  if (!result || result.teams.length === 0) {
    return (
      <div className="fade-in flex flex-col gap-4 px-5 pb-6 pt-8">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <AlertCircle size={32} className="text-amber-400/60" />
          <h3 className="text-sm font-semibold text-slate-300">No teams could be formed</h3>
          <p className="text-xs text-slate-500">
            {result?.warnings.join(' ') || 'Try adjusting your settings or adding more heroes to your roster.'}
          </p>
        </div>
      </div>
    );
  }

  const mode = gameModesById[modeId];
  const team = result.teams[selectedTeamIdx];
  const formationResult = formationResults[selectedTeamIdx];
  const formation = formationResult?.formation ?? (formationResult?.formationId ? formationsById[formationResult.formationId] : null) ?? null;

  return (
    <div className="fade-in flex flex-col gap-4 px-5 pb-6 pt-8">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400">
        <ArrowLeft size={16} /> Back to Settings
      </button>

      {/* Team selector tabs */}
      {result.teams.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {result.teams.map((t, idx) => (
            <button
              key={idx}
              onClick={() => onSelectTeam(idx)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedTeamIdx === idx
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-800/50 text-slate-400'
              }`}
            >
              Team {idx + 1}
            </button>
          ))}
        </div>
      )}

      {/* Score header */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Overall Score</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">
                {formationResult?.combinedScore ?? team.score}
              </span>
              <span className={`text-lg font-bold ${
                gradeFromScore(formationResult?.combinedScore ?? team.score) === 'S' ? 'text-amber-400' :
                gradeFromScore(formationResult?.combinedScore ?? team.score) === 'A' ? 'text-emerald-400' :
                'text-slate-400'
              }`}>
                {gradeFromScore(formationResult?.combinedScore ?? team.score)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500">Team: {team.score}</p>
            <p className="text-[10px] text-slate-500">Formation: {formationResult?.formationScore ?? '—'}</p>
            <p className="text-[10px] text-slate-500">Meta: {team.breakdown.meta?.toFixed(0) ?? '—'}</p>
          </div>
        </div>

        {formationResult && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-800/30 p-2">
            <Layers size={14} className="text-amber-400 shrink-0" />
            <span className="text-xs font-medium text-slate-300">{formationResult.formationName}</span>
          </div>
        )}
      </div>

      {/* Warnings */}
      {formationResult?.warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
          <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/80">{w}</p>
        </div>
      ))}

      {/* Formation board */}
      {formation && formationResult && formationResult.positions.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Formation & Positions
          </h2>
          <FormationBoard
            formation={formation}
            positions={formationResult.positions}
            onSlotClick={onSlotClick}
            selectedSlotId={selectedSlot?.slotId}
            onSwapPositions={(slotA, slotB) => onSwapPositions?.(selectedTeamIdx, slotA, slotB)}
          />
          <div className="mt-2 flex flex-col items-center gap-1">
            <p className="text-center text-[10px] text-slate-600">
              Tap ⇄ to swap hero positions or tap a hero to inspect placement reasons
            </p>
            <p className="text-center text-[9px] text-amber-500/50">
              Formation layout: Provisional · Position scoring: Heuristic (not verified game mechanics)
            </p>
          </div>
        </section>
      ) : (
        <div className="card flex flex-col items-center gap-2 p-5 text-center">
          <Info size={24} className="text-slate-600" />
          <p className="text-xs text-slate-500">
            No formation available for this mode. Showing team composition only.
          </p>
        </div>
      )}

      {/* Team breakdown */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Team Composition
          </h2>
          {/* Visual lineup thumbnails */}
          <div className="flex -space-x-2">
            {team.heroes.map((hero) => (
              <div key={hero.id} className="relative rounded-lg ring-2 ring-slate-900">
                <HeroPortrait hero={hero} size="xs" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {team.heroes.map((hero) => {
            const ph = formationResult?.positions.find(p => p.hero.id === hero.id);
            return (
              <div key={hero.id} className="card flex items-center gap-3 p-3">
                <HeroPortrait hero={hero} size="md" />
                <div className="flex-1 min-w-0">
                  <h3 className="truncate text-sm font-bold text-white">{hero.name}</h3>
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-slate-500">{CLASS_LABELS[hero.class]}</span>
                    <span className={`rounded px-1 py-0.5 text-[7px] font-bold ${RARITY_COLORS[hero.rarity]}`}>
                      {RARITY_LABELS[hero.rarity]}
                    </span>
                    <span className={`rounded px-1 py-0.5 text-[7px] font-medium ${FACTION_COLORS[hero.faction] ?? ''}`}>
                      {FACTION_LABELS[hero.faction] ?? hero.faction}
                    </span>
                    <span className="text-[9px] text-slate-600">Lv {hero.roster.level}</span>
                  </div>
                </div>
                {ph && (
                  <div className="text-right">
                    <div className="text-sm font-bold text-amber-400">#{ph.position}</div>
                    <div className="text-[8px] text-slate-500">{ph.positionScore} pts</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Explanation */}
      <section className="card p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Team Analysis
        </h3>
        <p className="mb-3 text-xs leading-relaxed text-slate-300">{team.explanation.summary}</p>

        {team.explanation.strengths.length > 0 && (
          <div className="mb-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/70">Strengths</p>
            <ul className="flex flex-col gap-1">
              {team.explanation.strengths.map((s, i) => (
                <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                  <span className="text-emerald-400/50 mt-0.5">+</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {team.explanation.weaknesses.length > 0 && (
          <div className="mb-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-rose-400/70">Weaknesses</p>
            <ul className="flex flex-col gap-1">
              {team.explanation.weaknesses.map((w, i) => (
                <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                  <span className="text-rose-400/50 mt-0.5">-</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {team.explanation.dataNotes.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">Data Notes</p>
            <ul className="flex flex-col gap-1">
              {team.explanation.dataNotes.map((n, i) => (
                <li key={i} className="text-[10px] text-slate-500">{n}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Formation alternatives */}
      {formationResult && formationResult.alternatives.length > 0 && (
        <section>
          <button
            onClick={onToggleAlternatives}
            className="card flex w-full items-center justify-between p-3"
          >
            <span className="text-xs font-semibold text-slate-300">
              Formation Alternatives ({formationResult.alternatives.length})
            </span>
            <ChevronRight
              size={14}
              className={`text-slate-500 transition-transform ${showAlternatives ? 'rotate-90' : ''}`}
            />
          </button>
          {showAlternatives && (
            <div className="mt-2 flex flex-col gap-1.5">
              {formationResult.alternatives.map((alt, i) => (
                <div key={i} className="card flex items-center justify-between p-3">
                  <span className="text-xs text-slate-300">{alt.formationName}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-400">{alt.combinedScore}</span>
                    <span className="ml-1 text-[10px] text-slate-500">({alt.formationScore})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Debug info */}
      {debugMode && result.debug && formationResult?.debug && (
        <section className="card border-slate-700/70 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Zap size={12} className="text-amber-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Debug</h3>
          </div>
          <div className="flex flex-col gap-1 text-[10px] text-slate-400">
            <div>Teams evaluated: {result.debug.candidatesEvaluated}</div>
            <div>Teams pruned: {result.debug.candidatesPruned}</div>
            <div>Team opt time: {result.debug.durationMs.toFixed(1)}ms</div>
            <div>Formations evaluated: {formationResult.debug.formationsEvaluated}</div>
            <div>Assignments evaluated: {formationResult.debug.assignmentsEvaluated}</div>
            <div>Formation opt time: {formationResult.debug.durationMs.toFixed(1)}ms</div>
            <div>Best formation: {formationResult.debug.bestFormationId}</div>
            <div>Position scoring mode: {formationResult.debug.positionScoringMode}</div>
            <div>Verified contribution: {Math.round(formationResult.debug.verifiedContribution * 100)}%</div>
            <div>Heuristic contribution: {Math.round(formationResult.debug.heuristicContribution * 100)}%</div>
            <div className="mt-1">
              Formation scores:
              {formationResult.debug.formationScores.map((fs, i) => (
                <span key={i} className="ml-1 text-slate-500">
                  {fs.formationId}:{fs.score}
                </span>
              ))}
            </div>
            <div className="mt-1">
              Top team scores: {result.debug.topScores.map(s => s).join(', ')}
            </div>
          </div>
        </section>
      )}

      {/* Position explanation modal */}
      {selectedSlot && formation && formationResult && (
        <PositionExplanation
          positionedHero={selectedSlot}
          formation={formation}
          positionScores={formationResult.positionScores}
          allHeroes={team.heroes}
          onClose={() => onSlotClick(null)}
        />
      )}

      {/* Enemy Team Analysis */}
      {enemyTeam && enemyTeam.heroes.length > 0 && (
        <EnemyAnalysisSection enemyTeam={enemyTeam} modeId={modeId} availableHeroIds={heroes.map((h) => h.id)} />
      )}
    </div>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================

function PageHeader({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <header className="flex flex-col gap-1 pt-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/15">
          <Icon size={20} className="text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
      </div>
      <p className="text-sm text-slate-400">{subtitle}</p>
    </header>
  );
}

function ModeCard({
  mode,
  isSelected,
  onSelect,
}: {
  mode: GameMode;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const formations = getFormationsForMode(mode.id);
  return (
    <button
      onClick={onSelect}
      className={`card flex items-center gap-3 p-4 text-left transition-all ${
        isSelected ? 'border-amber-500/50 bg-amber-500/5' : 'hover:border-slate-600'
      }`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
        isSelected
          ? 'bg-amber-500/10 border-amber-500/15'
          : 'bg-slate-800/50 border-slate-700/50'
      }`}>
        <Swords size={18} className={isSelected ? 'text-amber-400' : 'text-slate-400'} />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-bold text-white">{mode.name}</h3>
        <p className="text-xs text-slate-500">{mode.description}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[9px] text-slate-600">{mode.teamSize} heroes</span>
          {formations.length > 0 ? (
            <span className="text-[9px] text-emerald-400/60">{formations.length} formations</span>
          ) : (
            <span className="text-[9px] text-amber-400/60">No formation data</span>
          )}
        </div>
      </div>
      {isSelected && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500">
          <span className="h-2 w-2 rounded-full bg-slate-900" />
        </div>
      )}
    </button>
  );
}

// ============================================================
// ENEMY HERO PICKER
// ============================================================

function EnemyHeroPicker({
  selectedIds,
  onToggle,
  onClose,
}: {
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = heroes.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mt-2 card p-3">
      <div className="flex items-center gap-2 mb-2">
        <Search size={14} className="text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search heroes..."
          className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none"
        />
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
          <X size={14} />
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto space-y-1">
        {filtered.slice(0, 30).map((h) => (
          <button
            key={h.id}
            onClick={() => onToggle(h.id)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-all ${
              selectedIds.includes(h.id)
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-200'
                : 'hover:bg-slate-800/60 text-slate-300'
            }`}
          >
            <HeroPortrait hero={h} size="xs" />
            <span className="flex-1 text-xs font-medium">{h.name}</span>
            <span className="text-[9px] text-slate-500">{CLASS_LABELS[h.class]}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-slate-600">Select up to 5 enemy heroes</p>
    </div>
  );
}

// ============================================================
// ENEMY ANALYSIS SECTION
// ============================================================

function EnemyAnalysisSection({
  enemyTeam,
  modeId,
  availableHeroIds,
}: {
  enemyTeam: EnemyTeam;
  modeId: string;
  availableHeroIds: string[];
}) {
  const analysis = useMemo(
    () => analyseEnemyTeam(enemyTeam, availableHeroIds, modeId),
    [enemyTeam, availableHeroIds, modeId]
  );

  return (
    <section className="card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Target size={14} className="text-rose-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Enemy Analysis
        </h3>
      </div>

      {/* Enemy heroes */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {enemyTeam.heroes.map((id) => {
          const h = heroesById[id];
          return (
            <span key={id} className="flex items-center gap-1.5 rounded-lg border border-rose-700/40 bg-rose-950/20 px-2 py-1 text-xs text-rose-300">
              <HeroPortrait heroId={id} size="xs" />
              <span>{h?.name ?? id}</span>
            </span>
          );
        })}
      </div>

      {/* Threats */}
      {analysis.threats.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-rose-400/70">Threats</p>
          <ul className="space-y-1">
            {analysis.threats.map((t, i) => {
              const h = heroesById[t.heroId];
              return (
                <li key={i} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <HeroPortrait heroId={t.heroId} size="xs" />
                  <span className="font-medium text-slate-300">{h?.name ?? t.heroId}</span>
                  {t.threats.length > 0 && <span className="text-slate-500"> — {t.threats.join(' ')}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Recommended counters */}
      {analysis.recommendedHeroes.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-400/70">Recommended Counters</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.recommendedHeroes.map((c, i) => {
              const h = heroesById[c.heroId];
              return (
                <span key={i} className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] ${
                  c.strength === 'hard' ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300' :
                  c.strength === 'soft' ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300' :
                  'bg-slate-700/30 border border-slate-600/30 text-slate-400'
                }`}>
                  <HeroPortrait heroId={c.heroId} size="xs" />
                  <span>{h?.name ?? c.heroId} ({c.strength})</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Positioning notes */}
      {analysis.positioningNotes.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-sky-400/70">Positioning</p>
          <ul className="space-y-0.5">
            {analysis.positioningNotes.map((n, i) => (
              <li key={i} className="text-[10px] text-slate-500">{n}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Confidence */}
      <div className="flex items-center gap-2 text-[10px]">
        <span className={`font-semibold ${
          analysis.confidence === 'unknown' ? 'text-slate-600' :
          analysis.confidence === 'low' ? 'text-amber-400/70' :
          analysis.confidence === 'medium' ? 'text-sky-400/70' : 'text-emerald-400/70'
        }`}>
          {analysis.confidence.toUpperCase()} confidence
        </span>
        <span className="text-slate-600">· Counter scoring is {enemyTeam.heroes.length > 0 ? 'active' : 'neutral'}</span>
      </div>
    </section>
  );
}
