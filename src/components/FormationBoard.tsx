import React from 'react';
import type { Formation, PositionedHero } from '@/types';
import { CLASS_LABELS, ROLE_LABELS, RARITY_COLORS, RARITY_LABELS } from '@/utils/labels';
import { HeroPortrait } from '@/components/HeroPortrait';

interface FormationBoardProps {
  formation: Formation;
  positions: PositionedHero[];
  onSlotClick?: (positionedHero: PositionedHero) => void;
  selectedSlotId?: string | null;
  onSwapPositions?: (slotIdA: string, slotIdB: string) => void;
}

interface SlotWithHero {
  slotId: string;
  position: number;
  row: number;
  column: number;
  frontBack: 'front' | 'back';
  roleHint?: string;
  hero?: PositionedHero;
}

export function FormationBoard({
  formation,
  positions,
  onSlotClick,
  selectedSlotId,
  onSwapPositions,
}: FormationBoardProps) {
  const [draggedSlotId, setDraggedSlotId] = React.useState<string | null>(null);

  // Build a map of slotId -> positionedHero
  const positionMap = new Map<string, PositionedHero>();
  for (const ph of positions) {
    positionMap.set(ph.slotId, ph);
  }

  const handleSlotClick = (slot: SlotWithHero) => {
    if (onSwapPositions && draggedSlotId) {
      if (draggedSlotId !== slot.slotId) {
        onSwapPositions(draggedSlotId, slot.slotId);
      }
      setDraggedSlotId(null);
      return;
    }

    if (slot.hero && onSlotClick) {
      onSlotClick(slot.hero);
    }
  };

  const handleStartSwap = (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (draggedSlotId === slotId) {
      setDraggedSlotId(null);
    } else {
      setDraggedSlotId(slotId);
    }
  };

  // Group slots by row
  const slotsByRow = new Map<number, SlotWithHero[]>();
  for (const slot of formation.slots) {
    const row = slotsByRow.get(slot.row) ?? [];
    const hero = positionMap.get(slot.id);
    row.push({
      slotId: slot.id,
      position: slot.position,
      row: slot.row,
      column: slot.column,
      frontBack: slot.frontBack,
      roleHint: slot.roleHint,
      hero,
    });
    slotsByRow.set(slot.row, row);
  }

  // Sort rows: front row first (row 0), then back row (row 1)
  const sortedRows = [...slotsByRow.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4">
      {/* Enemy side label */}
      <div className="mb-2 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-rose-400/60">
        <span className="h-px flex-1 bg-rose-500/20" />
        Enemy Side
        <span className="h-px flex-1 bg-rose-500/20" />
      </div>

      {/* Battlefield */}
      <div className="flex flex-col gap-3">
        {sortedRows.map(([rowIdx, rowSlots], idx) => (
          <div key={rowIdx}>
            {/* Row label */}
            {idx === 0 && (
              <div className="mb-1.5 flex items-center justify-center">
                <span className="rounded-full bg-slate-800/60 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Frontline
                </span>
              </div>
            )}
            {idx === 1 && (
              <div className="mb-1.5 flex items-center justify-center">
                <span className="rounded-full bg-slate-800/60 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Backline
                </span>
              </div>
            )}

            {/* Slots in this row, ordered by column */}
            <div className="flex items-stretch justify-center gap-2 sm:gap-3">
              {rowSlots
                .sort((a, b) => a.column - b.column)
                .map((slot) => (
                  <FormationSlot
                    key={slot.slotId}
                    slot={slot}
                    onClick={() => handleSlotClick(slot)}
                    onStartSwap={(e) => handleStartSwap(slot.slotId, e)}
                    isSelected={selectedSlotId === slot.slotId}
                    isSwapTarget={draggedSlotId === slot.slotId}
                    canSwap={Boolean(onSwapPositions)}
                  />
                ))}
            </div>

            {/* Midfield divider after front row */}
            {idx === 0 && sortedRows.length > 1 && (
              <div className="my-2 flex items-center gap-2">
                <span className="h-px flex-1 bg-amber-500/15" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-amber-500/30">
                  Battlefield
                </span>
                <span className="h-px flex-1 bg-amber-500/15" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Player side label */}
      <div className="mt-2 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/60">
        <span className="h-px flex-1 bg-emerald-500/20" />
        Your Side
        <span className="h-px flex-1 bg-emerald-500/20" />
      </div>
    </div>
  );
}

function FormationSlot({
  slot,
  onClick,
  onStartSwap,
  isSelected,
  isSwapTarget,
  canSwap,
}: {
  slot: SlotWithHero;
  onClick?: () => void;
  onStartSwap?: (e: React.MouseEvent) => void;
  isSelected: boolean;
  isSwapTarget: boolean;
  canSwap: boolean;
}) {
  const hero = slot.hero;

  if (!hero) {
    return (
      <button
        onClick={onClick}
        className={`flex w-[72px] flex-col items-center gap-1 rounded-xl border border-dashed p-2 transition-all sm:w-[88px] ${
          isSwapTarget
            ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400'
            : 'border-slate-700/40 bg-slate-800/20 hover:border-slate-600'
        }`}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-800/40">
          <span className="text-sm font-bold text-slate-600">{slot.position}</span>
        </div>
        <span className="text-[9px] text-slate-600">
          {slot.roleHint ? ROLE_LABELS[slot.roleHint] : 'Empty'}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`relative flex w-[72px] flex-col items-center gap-1 rounded-xl border p-2 transition-all active:scale-95 sm:w-[88px] ${
        isSwapTarget
          ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400 animate-pulse'
          : isSelected
          ? 'border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/20'
          : 'border-slate-700/50 bg-slate-800/40 hover:border-amber-500/30'
      }`}
    >
      {/* Portrait */}
      <div className="relative">
        <HeroPortrait hero={hero.hero} size="md" />
        {/* Position number badge */}
        <span className="absolute -left-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-slate-900 shadow">
          {slot.position}
        </span>
        {/* Swap button icon */}
        {canSwap && (
          <button
            onClick={onStartSwap}
            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 border border-amber-500/40 text-[8px] text-amber-300 shadow hover:bg-amber-500 hover:text-slate-900"
            title="Swap position"
          >
            ⇄
          </button>
        )}
      </div>

      {/* Name */}
      <span className="w-full truncate text-center text-[10px] font-bold text-white sm:text-xs">
        {hero.hero.name}
      </span>

      {/* Class + score */}
      <div className="flex w-full items-center justify-between gap-0.5">
        <span className="text-[8px] text-slate-500">
          {CLASS_LABELS[hero.hero.class]}
        </span>
        <span className="text-[8px] font-bold text-amber-400">
          {hero.positionScore}
        </span>
      </div>

      {/* Rarity badge */}
      <span
        className={`rounded px-1 py-0.5 text-[7px] font-bold ${RARITY_COLORS[hero.hero.rarity]}`}
      >
        {RARITY_LABELS[hero.hero.rarity]}
      </span>
    </button>
  );
}
