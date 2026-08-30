import type { Hero, RosterHero } from '@/types';
import { ascensionTiersById } from '@/data/progression';
import { FACTION_LABELS, CLASS_LABELS, FACTION_COLORS, RARITY_COLORS, RARITY_LABELS } from '@/utils/labels';
import { HeroPortrait } from '@/components/HeroPortrait';

interface RosterCardProps {
  hero: Hero;
  rosterEntry?: RosterHero;
  onToggle: (heroId: string) => void;
  onEdit: (heroId: string) => void;
}

export function RosterCard({ hero, rosterEntry, onToggle, onEdit }: RosterCardProps) {
  const isOwned = rosterEntry?.owned ?? false;
  const level = rosterEntry?.level;
  const ascension = rosterEntry?.progression?.ascension;
  const ascensionInfo = ascension ? ascensionTiersById[ascension] : undefined;

  return (
    <div
      className={`card relative flex flex-col items-center p-2.5 text-center transition-colors ${
        isOwned ? 'border-amber-500/35 bg-slate-900/90 shadow-sm' : 'border-slate-800/80 opacity-55 grayscale-[40%]'
      }`}
    >
      {/* Owned toggle button */}
      <button
        onClick={() => onToggle(hero.id)}
        className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full transition-colors"
        aria-label={isOwned ? 'Remove from roster' : 'Add to roster'}
      >
        {isOwned ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-slate-900 shadow">
            ✓
          </span>
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-[14px] font-light leading-none text-slate-400">
            +
          </span>
        )}
      </button>

      {/* Hero Portrait with click to edit */}
      <div
        onClick={() => isOwned && onEdit(hero.id)}
        className={`mb-1.5 ${isOwned ? 'cursor-pointer transition-transform hover:scale-105 active:scale-95' : ''}`}
      >
        <HeroPortrait hero={hero} size="lg" />
      </div>

      <h3 className="w-full truncate text-[11px] font-bold text-white">{hero.name}</h3>

      <div className="mt-0.5 flex items-center gap-1">
        <span className="text-[9px] text-slate-500">{CLASS_LABELS[hero.class]}</span>
      </div>

      {/* Owned hero progression info */}
      {isOwned && (
        <div className="mt-1 flex flex-col items-center gap-0.5">
          {level !== undefined && (
            <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
              Lv {level}
            </span>
          )}
          {ascensionInfo && (
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${RARITY_COLORS[hero.rarity]}`}>
              {ascensionInfo.shortLabel}
            </span>
          )}
          <button
            onClick={() => onEdit(hero.id)}
            className="mt-0.5 text-[9px] font-medium text-sky-400 hover:text-sky-300"
          >
            Edit
          </button>
        </div>
      )}

      {/* Not owned indicator */}
      {!isOwned && (
        <span className="mt-1 text-[9px] text-slate-600">Not owned</span>
      )}
    </div>
  );
}
