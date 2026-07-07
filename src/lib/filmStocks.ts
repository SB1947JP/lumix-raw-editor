/**
 * White-balance + colour-character presets simulating film stocks that were on
 * shop shelves around the turn of the millennium.
 *
 * Film was balanced for a fixed illuminant — daylight stocks for 5500K
 * photographic daylight, tungsten ("Type B") stocks for 3200K studio lamps —
 * so `temperature` is the stock's balance point as a mired shift from this
 * editor's D65 (6500K) neutral, which is exactly what the Temperature slider
 * speaks (see lib/whiteBalance.ts). But balance alone can't tell stocks of the
 * same speed class apart (every daylight film sits at 5500K, which made the
 * presets render near-identically); what actually distinguished them was
 * colour *character* — Portra's muted skin-first palette vs Gold's punchy
 * consumer saturation vs Provia's crisp neutrality — so each preset also
 * carries a saturation/vibrance signature and the brand's well-known
 * green–magenta tint (Fuji's cooler greens vs Kodak's warmer golds).
 *
 * The tungsten entry simulates the classic mistake-turned-look of shooting
 * 3200K-balanced slide film (Ektachrome 320T) in daylight — a strong blue,
 * cinematic cast. Its true shift (−159 mired) exceeds the slider's ±100
 * range, so it pins at the slider's maximum cool.
 */
export interface FilmStockPreset {
  label: string;
  temperature: number;
  tint: number;
  saturation: number;
  vibrance: number;
}

export const FILM_STOCKS: FilmStockPreset[] = [
  { label: 'As shot', temperature: 0, tint: 0, saturation: 0, vibrance: 0 },
  { label: 'Kodachrome 64 · 5500K', temperature: 28, tint: 4, saturation: 8, vibrance: 6 },
  { label: 'Kodak Gold 200 · 5500K', temperature: 40, tint: 8, saturation: 12, vibrance: 4 },
  { label: 'Kodak Portra 400 · 5500K', temperature: 30, tint: 3, saturation: -8, vibrance: 6 },
  { label: 'Fuji Superia 400 · 5500K', temperature: 22, tint: -8, saturation: 10, vibrance: 0 },
  { label: 'Fuji Provia 100F · 5500K', temperature: 6, tint: -5, saturation: 6, vibrance: 4 },
  { label: 'Fuji Provia 400X · 5500K', temperature: 12, tint: -7, saturation: 8, vibrance: 2 },
  { label: 'Ektachrome E100 · 5500K', temperature: 12, tint: 0, saturation: 2, vibrance: 0 },
  { label: 'Ektachrome 320T in daylight · 3200K', temperature: -100, tint: -6, saturation: -6, vibrance: 0 },
];

/** The preset matching the current slider values, or undefined (= "Custom"). */
export function matchFilmStock(
  temperature: number,
  tint: number,
  saturation: number,
  vibrance: number,
): FilmStockPreset | undefined {
  return FILM_STOCKS.find(
    (p) =>
      p.temperature === temperature &&
      p.tint === tint &&
      p.saturation === saturation &&
      p.vibrance === vibrance,
  );
}
