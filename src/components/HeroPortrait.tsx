import React, { useState } from 'react';
import type { Hero, HeroFaction, HeroRarity } from '@/types';
import { getHeroImageData } from '@/services/HeroImageService';
import { RARITY_COLORS } from '@/utils/labels';

export type PortraitSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface HeroPortraitProps {
  hero?: Hero | { id: string; name: string; faction?: HeroFaction; rarity?: HeroRarity };
  heroId?: string;
  size?: PortraitSize;
  className?: string;
  showFallbackBadge?: boolean;
  priority?: boolean;
}

const SIZE_CLASSES: Record<PortraitSize, { container: string; text: string }> = {
  xs: { container: 'w-6 h-6 rounded-md', text: 'text-[10px] font-bold' },
  sm: { container: 'w-8 h-8 rounded-lg', text: 'text-xs font-bold' },
  md: { container: 'w-11 h-11 rounded-lg', text: 'text-sm font-bold' },
  lg: { container: 'w-14 h-14 rounded-xl', text: 'text-base font-bold' },
  xl: { container: 'w-20 h-20 rounded-2xl', text: 'text-xl font-bold' },
};

export const HeroPortrait: React.FC<HeroPortraitProps> = ({
  hero,
  heroId,
  size = 'md',
  className = '',
  priority = false,
}) => {
  const targetId = hero?.id ?? heroId ?? '';
  const imageData = getHeroImageData(targetId);

  const [imgSrc, setImgSrc] = useState<string | null>(imageData?.primaryUrl ?? null);
  const [hasError, setHasError] = useState<boolean>(!imageData);

  // Update state if target hero changes
  React.useEffect(() => {
    const data = getHeroImageData(targetId);
    setImgSrc(data?.primaryUrl ?? null);
    setHasError(!data);
  }, [targetId]);

  const rarityColor = hero?.rarity ? RARITY_COLORS[hero.rarity] : 'border-slate-700/60';
  const sizeCfg = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;
  const initial = (hero?.name ?? targetId ?? '?').charAt(0).toUpperCase();

  const handleImageError = () => {
    setHasError(true);
  };

  if (!imageData || hasError || !imgSrc) {
    return (
      <div
        className={`flex items-center justify-center font-bold select-none border border-slate-700/60 bg-slate-800/90 text-slate-300 shadow-inner ${sizeCfg.container} ${sizeCfg.text} ${className}`}
        title={hero?.name ?? targetId}
        aria-label={imageData?.altText ?? `${hero?.name ?? targetId} badge`}
      >
        {initial}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden shrink-0 bg-slate-900 border border-slate-700/50 shadow-sm ${sizeCfg.container} ${rarityColor} ${className}`}
    >
      <img
        src={imgSrc}
        alt={imageData.altText}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={handleImageError}
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
};

