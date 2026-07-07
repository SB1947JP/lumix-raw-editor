/**
 * White-balance presets simulating the colour balance of film stocks that were
 * on shop shelves around 1999.
 *
 * Film was balanced for a fixed illuminant — daylight stocks for 5500K
 * photographic daylight, tungsten ("Type B") stocks for 3200K studio lamps —
 * so shooting the same scene on different stocks shifted its rendered colour
 * temperature in a predictable way. `temperature` here is the mired shift of
 * the stock's balance point from this editor's D65 (6500K) neutral, which is
 * exactly what the Temperature slider speaks (see lib/whiteBalance.ts):
 * 5500K → +28 mired of warmth. `tint` adds the brand's well-known cast on the
 * green–magenta axis (Fuji's cooler greens vs Kodak's warmer golds).
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
}

export const FILM_STOCKS: FilmStockPreset[] = [
  { label: 'As shot', temperature: 0, tint: 0 },
  { label: 'Kodachrome 64 · 5500K', temperature: 28, tint: 4 },
  { label: 'Kodak Gold 200 · 5500K', temperature: 40, tint: 8 },
  { label: 'Kodak Portra 400 · 5500K', temperature: 32, tint: 4 },
  { label: 'Fuji Superia 400 · 5500K', temperature: 24, tint: -8 },
  { label: 'Ektachrome E100 · 5500K', temperature: 12, tint: 0 },
  { label: 'Ektachrome 320T in daylight · 3200K', temperature: -100, tint: -6 },
];

/** The preset matching the current slider values, or undefined (= "Custom"). */
export function matchFilmStock(temperature: number, tint: number): FilmStockPreset | undefined {
  return FILM_STOCKS.find((p) => p.temperature === temperature && p.tint === tint);
}
