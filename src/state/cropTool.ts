import { create } from 'zustand';

/** 'free' = no lock, 'original' = source image's own aspect, number = a landscape-form (>=1) width/height ratio. */
export type RatioPreset = 'free' | 'original' | number;
export type Orientation = 'landscape' | 'portrait';

export const RATIO_PRESETS: { label: string; value: RatioPreset }[] = [
  { label: 'Free', value: 'free' },
  { label: 'Original', value: 'original' },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '5:4', value: 5 / 4 },
];

interface CropToolStore {
  ratio: RatioPreset;
  orientation: Orientation;
  // True until the user manually touches the crop (drags a handle, toggles
  // the checkbox, or picks a ratio) — while true, changing Rotation keeps the
  // crop tracking the ideal "no smudged corners" rectangle automatically.
  // Once false, rotation changes only ever shrink the user's own crop to
  // stay inside that safe rectangle, never override it.
  autoRotationCrop: boolean;
  setRatio: (r: RatioPreset) => void;
  toggleOrientation: () => void;
  setAutoRotationCrop: (v: boolean) => void;
  resetForNewImage: () => void;
}

export const useCropTool = create<CropToolStore>((set) => ({
  ratio: 'free',
  orientation: 'landscape',
  autoRotationCrop: true,
  setRatio: (r) => set({ ratio: r }),
  toggleOrientation: () => set((s) => ({ orientation: s.orientation === 'landscape' ? 'portrait' : 'landscape' })),
  setAutoRotationCrop: (v) => set({ autoRotationCrop: v }),
  resetForNewImage: () => set({ autoRotationCrop: true }),
}));

/**
 * Resolves a ratio preset + orientation to a concrete width/height pixel
 * ratio, or null when unlocked. The preset itself always stays in its
 * canonical (landscape, >=1) form — only `orientation` flips it — so the
 * dropdown selection never changes when the user hits the swap button.
 */
export function resolveLockedAspect(
  ratio: RatioPreset,
  orientation: Orientation,
  imageWidth: number,
  imageHeight: number,
): number | null {
  if (ratio === 'free') return null;
  const base = ratio === 'original' ? Math.max(imageWidth, imageHeight) / Math.min(imageWidth, imageHeight) : ratio;
  return orientation === 'landscape' ? base : 1 / base;
}
