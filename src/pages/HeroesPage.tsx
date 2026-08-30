import { useState, useMemo } from 'react';
import { Database, Search, ChevronDown, X, Filter } from 'lucide-react';
import { heroes } from '@/data/heroes';
import { factions } from '@/data/factions';
import { HeroCard } from '@/components/HeroCard';
import {
  FACTION_LABELS,
  CLASS_LABELS,
  ROLE_LABELS,
  RARITY_LABELS,
} from '@/utils/labels';
import type { FactionId, HeroClass, HeroRole, HeroRarity } from '@/types';
import type { LucideIcon } from 'lucide-react';

interface HeroesPageProps {
  onSelectHero: (heroId: string) => void;
}

type SortOption = 'name_asc' | 'name_desc' | 'rarity' | 'faction';

export function HeroesPage({ onSelectHero }: HeroesPageProps) {
  const [search, setSearch] = useState('');
  const [factionFilter, setFactionFilter] = useState<FactionId | 'all'>('all');
  const [classFilter, setClassFilter] = useState<HeroClass | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<HeroRole | 'all'>('all');
  const [rarityFilter, setRarityFilter] = useState<HeroRarity | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('name_asc');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = heroes.filter((hero) => {
      if (search && !hero.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (factionFilter !== 'all' && hero.faction !== factionFilter) return false;
      if (classFilter !== 'all' && hero.class !== classFilter) return false;
      if (roleFilter !== 'all' && !hero.roles.includes(roleFilter)) return false;
      if (rarityFilter !== 'all' && hero.rarity !== rarityFilter) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'rarity': {
          const order: Record<HeroRarity, number> = { s_level: 0, a_level: 1, rare_level: 2 };
          return order[a.rarity] - order[b.rarity] || a.name.localeCompare(b.name);
        }
        case 'faction':
          return FACTION_LABELS[a.faction].localeCompare(FACTION_LABELS[b.faction]) || a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [search, factionFilter, classFilter, roleFilter, rarityFilter, sort]);

  const activeFilterCount =
    (factionFilter !== 'all' ? 1 : 0) +
    (classFilter !== 'all' ? 1 : 0) +
    (roleFilter !== 'all' ? 1 : 0) +
    (rarityFilter !== 'all' ? 1 : 0);

  function clearFilters() {
    setFactionFilter('all');
    setClassFilter('all');
    setRoleFilter('all');
    setRarityFilter('all');
  }

  return (
    <div className="fade-in flex flex-col gap-4 px-5 pb-6 pt-8">
      <PageHeader icon={Database} title="Hero Database" subtitle={`${heroes.length} heroes`} />

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search hero name..."
          className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-11 pr-10 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Sort + Filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-800/50 py-2.5 pl-3 pr-9 text-sm text-slate-200 focus:border-amber-500/40 focus:outline-none"
          >
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="rarity">Rarity</option>
            <option value="faction">Faction</option>
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 rounded-xl border py-2.5 px-3 text-sm font-medium transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
              : 'border-slate-700 bg-slate-800/50 text-slate-300'
          }`}
        >
          <Filter size={16} />
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-slate-900">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card space-y-4 p-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Faction</label>
            <FilterChips
              options={[{ value: 'all', label: 'All' }, ...factions.map((f) => ({ value: f.id, label: f.name }))]}
              value={factionFilter}
              onChange={(v) => setFactionFilter(v as FactionId | 'all')}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Class</label>
            <FilterChips
              options={[
                { value: 'all', label: 'All' },
                { value: 'warrior', label: 'Warrior' },
                { value: 'tank', label: 'Tank' },
                { value: 'marksman', label: 'Marksman' },
                { value: 'mage', label: 'Mage' },
                { value: 'rogue', label: 'Rogue' },
                { value: 'support', label: 'Support' },
              ]}
              value={classFilter}
              onChange={(v) => setClassFilter(v as HeroClass | 'all')}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Rarity</label>
            <FilterChips
              options={[
                { value: 'all', label: 'All' },
                { value: 's_level', label: 'S-Level' },
                { value: 'a_level', label: 'A-Level' },
                { value: 'rare_level', label: 'Rare' },
              ]}
              value={rarityFilter}
              onChange={(v) => setRarityFilter(v as HeroRarity | 'all')}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Role</label>
            <FilterChips
              options={[
                { value: 'all', label: 'All' },
                ...Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
              value={roleFilter}
              onChange={(v) => setRoleFilter(v as HeroRole | 'all')}
            />
            <p className="mt-1.5 text-xs text-slate-600">
              Role data not yet assigned — no heroes will match role filters.
            </p>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-xs font-medium text-amber-400 hover:text-amber-300">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      <p className="text-xs text-slate-500">
        {filtered.length === heroes.length
          ? `${filtered.length} heroes`
          : `${filtered.length} of ${heroes.length} heroes`}
      </p>

      {/* Hero grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-3 gap-2.5">
          {filtered.map((hero) => (
            <HeroCard key={hero.id} hero={hero} onClick={onSelectHero} />
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center gap-2 p-8 text-center">
          <p className="text-sm font-semibold text-slate-300">No heroes found</p>
          <p className="text-xs text-slate-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}

function FilterChips({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
              : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

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
