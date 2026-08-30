import { useState, useMemo, useRef } from 'react';
import { Users, Search, X, Filter, Download, Upload, Trash2, ChevronDown, ScanLine, CheckCircle2 } from 'lucide-react';
import { heroes } from '@/data/heroes';
import { factions } from '@/data/factions';
import { useRoster } from '@/services/RosterStore';
import { rosterService, validateRoster } from '@/services/RosterService';
import { RosterCard } from '@/components/RosterCard';
import { RosterHeroEditor } from '@/components/RosterHeroEditor';
import { FACTION_LABELS, CLASS_LABELS, FACTION_COLORS } from '@/utils/labels';
import { getHighestLevel, getFactionDistribution } from '@/utils/playerHero';
import type { FactionId, HeroClass } from '@/types';
import type { LucideIcon } from 'lucide-react';

type OwnershipFilter = 'all' | 'owned' | 'not_owned';
type SortOption = 'name_asc' | 'name_desc' | 'level_desc' | 'owned_first';

export function RosterPage() {
  const { roster, rosterMap, ownedCount, totalCount, toggleOwned, clearRoster, setRoster, mergeRoster, refresh } = useRoster();
  const [search, setSearch] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [factionFilter, setFactionFilter] = useState<FactionId | 'all'>('all');
  const [classFilter, setClassFilter] = useState<HeroClass | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('owned_first');
  const [showFilters, setShowFilters] = useState(false);
  const [editingHeroId, setEditingHeroId] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let result = heroes.filter((hero) => {
      if (search && !hero.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (factionFilter !== 'all' && hero.faction !== factionFilter) return false;
      if (classFilter !== 'all' && hero.class !== classFilter) return false;

      const entry = rosterMap.get(hero.id);
      const isOwned = entry?.owned ?? false;
      if (ownershipFilter === 'owned' && !isOwned) return false;
      if (ownershipFilter === 'not_owned' && isOwned) return false;

      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'level_desc': {
          const aLevel = rosterMap.get(a.id)?.level ?? 0;
          const bLevel = rosterMap.get(b.id)?.level ?? 0;
          return bLevel - aLevel || a.name.localeCompare(b.name);
        }
        case 'owned_first': {
          const aOwned = rosterMap.get(a.id)?.owned ? 0 : 1;
          const bOwned = rosterMap.get(b.id)?.owned ? 0 : 1;
          return aOwned - bOwned || a.name.localeCompare(b.name);
        }
      }
    });

    return result;
  }, [search, factionFilter, classFilter, ownershipFilter, sort, rosterMap]);

  const activeFilterCount =
    (ownershipFilter !== 'all' ? 1 : 0) +
    (factionFilter !== 'all' ? 1 : 0) +
    (classFilter !== 'all' ? 1 : 0);

  const highestLevel = useMemo(() => getHighestLevel(roster), [roster]);
  const factionDist = useMemo(() => getFactionDistribution(roster), [roster]);
  const completionPct = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  function clearFilters() {
    setOwnershipFilter('all');
    setFactionFilter('all');
    setClassFilter('all');
  }

  function handleExport() {
    const data = rosterService.exportRoster();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `afkj-roster-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    setShowImportMenu(true);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, mode: 'replace' | 'merge') {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result;
        const data = JSON.parse(raw as string);
        const result = rosterService.importRoster(data, mode);
        if (result.success) {
          refresh();
          setImportMessage({ type: 'success', text: `Imported ${result.roster.length} heroes successfully.` });
        } else {
          setImportMessage({ type: 'error', text: result.error ?? 'Import failed.' });
        }
      } catch {
        setImportMessage({ type: 'error', text: 'Invalid JSON file. Could not parse roster data.' });
      }
      setShowImportMenu(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleReset() {
    if (confirm('Reset your entire roster? This removes all owned heroes and progression. Game data is not affected.')) {
      clearRoster();
      setImportMessage({ type: 'success', text: 'Roster has been reset.' });
    }
  }

  function handleValidate() {
    const result = validateRoster(roster);
    if (result.valid) {
      setImportMessage({ type: 'success', text: `Roster valid. ${roster.length} entries, 0 errors.` });
    } else {
      setImportMessage({ type: 'error', text: `${result.errors} error(s) found. First: ${result.issues[0]?.message}` });
    }
  }

  return (
    <div className="fade-in flex flex-col gap-4 px-5 pb-6 pt-8">
      <PageHeader icon={Users} title="My Roster" subtitle="Manage the heroes you own" />

      {/* Summary */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Roster Complete</p>
            <p className="text-2xl font-black text-white">
              {ownedCount} <span className="text-base font-normal text-slate-500">/ {totalCount}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="relative h-12 w-12">
              <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#1e293b" strokeWidth="4" />
                <circle
                  cx="24" cy="24" r="20" fill="none" stroke="#e2b04a" strokeWidth="4"
                  strokeDasharray={`${(completionPct / 100) * 125.6} 125.6`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-amber-400">
                {completionPct}%
              </span>
            </div>
          </div>
        </div>

        {highestLevel > 0 && (
          <div className="mt-3 flex items-center gap-2 border-t border-slate-800 pt-3">
            <CheckCircle2 size={14} className="text-amber-400" />
            <span className="text-xs text-slate-400">Highest level: <span className="font-semibold text-slate-200">{highestLevel}</span></span>
          </div>
        )}

        {Object.keys(factionDist).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-800 pt-3">
            {Object.entries(factionDist).map(([factionId, count]) => (
              <span key={factionId} className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${FACTION_COLORS[factionId] ?? ''}`}>
                {FACTION_LABELS[factionId] ?? factionId}: {count}
              </span>
            ))}
          </div>
        )}
      </div>

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
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Sort + Filter toggle + Quick ownership filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-800/50 py-2.5 pl-3 pr-9 text-sm text-slate-200 focus:border-amber-500/40 focus:outline-none"
          >
            <option value="owned_first">Owned First</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="level_desc">Highest Level</option>
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
        <button
          onClick={() => setOwnershipFilter(ownershipFilter === 'owned' ? 'all' : 'owned')}
          className={`rounded-xl border py-2.5 px-3 text-xs font-bold transition-colors ${
            ownershipFilter === 'owned'
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
              : 'border-slate-700 bg-slate-800/50 text-slate-400'
          }`}
        >
          OWNED
        </button>
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
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Ownership</label>
            <FilterChips
              options={[
                { value: 'all', label: 'All' },
                { value: 'owned', label: 'Owned' },
                { value: 'not_owned', label: 'Not Owned' },
              ]}
              value={ownershipFilter}
              onChange={(v) => setOwnershipFilter(v as OwnershipFilter)}
            />
          </div>
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
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-xs font-medium text-amber-400 hover:text-amber-300">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2">
        <ActionButton icon={Download} label="Export" onClick={handleExport} />
        <ActionButton icon={Upload} label="Import" onClick={handleImportClick} />
        <ActionButton icon={Trash2} label="Reset" onClick={handleReset} danger />
      </div>

      {/* Import mode menu */}
      {showImportMenu && (
        <div className="card space-y-2 p-4">
          <p className="text-sm font-semibold text-slate-200">Choose import mode:</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary w-full py-3 text-sm font-medium"
          >
            Replace Current Roster
          </button>
          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.dataset.mode = 'merge';
                fileInputRef.current?.click();
              }
            }}
            className="btn-secondary w-full py-3 text-sm font-medium"
          >
            Merge With Current Roster
          </button>
          <button onClick={() => setShowImportMenu(false)} className="text-xs text-slate-500 hover:text-slate-300">
            Cancel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const mode = (e.target.dataset.mode === 'merge' ? 'merge' : 'replace');
              handleFileSelect(e, mode);
              delete e.target.dataset.mode;
            }}
          />
        </div>
      )}

      {/* Validation button */}
      <button onClick={handleValidate} className="text-xs font-medium text-sky-400 hover:text-sky-300">
        Validate Roster Data
      </button>

      {/* Import message */}
      {importMessage && (
        <div className={`card p-3 text-sm ${importMessage.type === 'success' ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
          <p className={importMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}>
            {importMessage.text}
          </p>
          <button onClick={() => setImportMessage(null)} className="mt-1 text-xs text-slate-500">
            Dismiss
          </button>
        </div>
      )}

      {/* Scan placeholder */}
      <button
        disabled
        className="flex items-center justify-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/20 py-3 text-sm font-medium text-slate-600"
      >
        <ScanLine size={18} />
        Scan Roster — Coming Soon
      </button>

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
            <RosterCard
              key={hero.id}
              hero={hero}
              rosterEntry={rosterMap.get(hero.id)}
              onToggle={toggleOwned}
              onEdit={setEditingHeroId}
            />
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center gap-2 p-8 text-center">
          <p className="text-sm font-semibold text-slate-300">No heroes found</p>
          <p className="text-xs text-slate-500">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Bottom sheet editor */}
      <RosterHeroEditor heroId={editingHeroId} onClose={() => setEditingHeroId(null)} />
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, danger }: { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-colors ${
        danger
          ? 'border-red-900/40 bg-red-950/20 text-red-300 hover:bg-red-950/30'
          : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function FilterChips({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (value: string) => void }) {
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
