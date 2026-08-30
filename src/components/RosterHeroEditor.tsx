import { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import type { RosterHero, AscensionTier } from '@/types';
import { heroesById } from '@/data/heroes';
import { ascensionTiers } from '@/data/progression';
import { useRoster } from '@/services/RosterStore';
import { HeroPortrait } from '@/components/HeroPortrait';
import { FACTION_LABELS, CLASS_LABELS, FACTION_COLORS } from '@/utils/labels';

interface RosterHeroEditorProps {
  heroId: string | null;
  onClose: () => void;
}

export function RosterHeroEditor({ heroId, onClose }: RosterHeroEditorProps) {
  const { rosterMap, setOwned, setLevel, setAscension, setProgressionField, removeHero } = useRoster();
  const hero = heroId ? heroesById[heroId] : null;
  const entry = heroId ? rosterMap.get(heroId) : undefined;

  const [levelInput, setLevelInput] = useState('');
  const [sigInput, setSigInput] = useState('');
  const [furnInput, setFurnInput] = useState('');
  const [engrInput, setEngrInput] = useState('');
  const [showAscensionPicker, setShowAscensionPicker] = useState(false);

  useEffect(() => {
    if (entry) {
      setLevelInput(String(entry.level));
      setSigInput(entry.progression.signatureLevel != null ? String(entry.progression.signatureLevel) : '');
      setFurnInput(entry.progression.furnitureLevel != null ? String(entry.progression.furnitureLevel) : '');
      setEngrInput(entry.progression.engravingLevel != null ? String(entry.progression.engravingLevel) : '');
    }
  }, [entry]);

  if (!heroId || !hero) return null;

  const isOwned = entry?.owned ?? false;

  function handleLevelChange(v: string) {
    setLevelInput(v);
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 0) {
      setLevel(heroId!, n);
    }
  }

  function handleSigChange(v: string) {
    setSigInput(v);
    if (v === '') {
      setProgressionField(heroId!, 'signatureLevel', undefined);
    } else {
      const n = parseInt(v, 10);
      if (!isNaN(n) && n >= 0) setProgressionField(heroId!, 'signatureLevel', n);
    }
  }

  function handleFurnChange(v: string) {
    setFurnInput(v);
    if (v === '') {
      setProgressionField(heroId!, 'furnitureLevel', undefined);
    } else {
      const n = parseInt(v, 10);
      if (!isNaN(n) && n >= 0) setProgressionField(heroId!, 'furnitureLevel', n);
    }
  }

  function handleEngrChange(v: string) {
    setEngrInput(v);
    if (v === '') {
      setProgressionField(heroId!, 'engravingLevel', undefined);
    } else {
      const n = parseInt(v, 10);
      if (!isNaN(n) && n >= 0) setProgressionField(heroId!, 'engravingLevel', n);
    }
  }

  function handleRemove() {
    if (confirm(`Remove ${hero!.name} from your roster?`)) {
      removeHero(heroId!);
      onClose();
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-slate-700 bg-[#0d1320] safe-bottom">
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="flex items-center gap-3">
            <HeroPortrait hero={hero} size="lg" />
            <div>
              <h2 className="text-base font-bold text-white">{hero.name}</h2>
              <div className="flex items-center gap-1.5">
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${FACTION_COLORS[hero.faction] ?? ''}`}>
                  {FACTION_LABELS[hero.faction]}
                </span>
                <span className="text-[11px] text-slate-500">{CLASS_LABELS[hero.class]}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 px-5 pb-6">
          {/* Ownership toggle */}
          <div className="card flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">Owned</p>
              <p className="text-xs text-slate-500">{isOwned ? 'In your roster' : 'Not in your roster'}</p>
            </div>
            <button
              onClick={() => setOwned(heroId, !isOwned)}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                isOwned ? 'bg-amber-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle ownership"
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                  isOwned ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {isOwned && (
            <>
              {/* Level */}
              <div className="card p-4">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Level
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={levelInput}
                  onChange={(e) => handleLevelChange(e.target.value)}
                  placeholder="1"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-lg font-bold text-amber-400 focus:border-amber-500/40 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-600">Whole numbers only. No negative values.</p>
              </div>

              {/* Ascension */}
              <div className="card p-4">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Ascension
                </label>
                <button
                  onClick={() => setShowAscensionPicker(!showAscensionPicker)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm font-medium text-slate-200"
                >
                  <span>{entry?.progression?.ascension ? ascensionTiers.find((t) => t.id === entry.progression.ascension)?.label : 'Select...'}</span>
                  <ChevronDown size={16} className="text-slate-500" />
                </button>
                {showAscensionPicker && (
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {ascensionTiers.map((tier) => (
                      <button
                        key={tier.id}
                        onClick={() => {
                          setAscension(heroId, tier.id as AscensionTier);
                          setShowAscensionPicker(false);
                        }}
                        className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                          entry?.progression?.ascension === tier.id
                            ? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                            : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {tier.shortLabel}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional progression fields */}
              <div className="card space-y-3 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Optional Progression
                </p>
                <ProgressionInput label="Signature Level" value={sigInput} onChange={handleSigChange} />
                <ProgressionInput label="Furniture Level" value={furnInput} onChange={handleFurnChange} />
                <ProgressionInput label="Engraving Level" value={engrInput} onChange={handleEngrChange} />
              </div>

              {/* Remove button */}
              <button
                onClick={handleRemove}
                className="w-full rounded-xl border border-red-900/40 bg-red-950/20 py-3 text-sm font-semibold text-red-300 transition-colors hover:bg-red-950/30"
              >
                Remove from Roster
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ProgressionInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-slate-400">{label}</label>
      <input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="w-24 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-right text-sm font-semibold text-slate-200 focus:border-amber-500/40 focus:outline-none"
      />
    </div>
  );
}
