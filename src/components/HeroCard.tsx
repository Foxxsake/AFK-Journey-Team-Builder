import type { Hero } from '@/types';
import { FACTION_LABELS, CLASS_LABELS, RARITY_LABELS, RARITY_COLORS, FACTION_COLORS } from '@/utils/labels';
import { HeroPortrait } from '@/components/HeroPortrait';

interface HeroCardProps {
  hero: Hero;
  onClick: (heroId: string) => void;
}

export function HeroCard({ hero, onClick }: HeroCardProps) {
  return (
    <button
      onClick={() => onClick(hero.id)}
      className="card flex flex-col items-center p-3 text-center transition-all hover:border-amber-500/40 hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="mb-2">
        <HeroPortrait hero={hero} size="lg" />
      </div>

      <h3 className="w-full truncate text-sm font-bold text-white">{hero.name}</h3>

      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
        <span
          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${FACTION_COLORS[hero.faction] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}
        >
          {FACTION_LABELS[hero.faction] ?? hero.faction}
        </span>
      </div>

      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-[10px] text-slate-500">
          {CLASS_LABELS[hero.class]}
        </span>
        <span
          className={`rounded px-1 py-0.5 text-[9px] font-bold ${RARITY_COLORS[hero.rarity]}`}
        >
          {RARITY_LABELS[hero.rarity]}
        </span>
      </div>
    </button>
  );
}
