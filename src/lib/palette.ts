/** A handful of traditional Japanese colour names (Nippon Colors), toned
 *  down further (blended ~25% toward neutral gray) from their muted form so
 *  they read as barely-there accents rather than competing with the photo
 *  itself.
 *
 *  Kept complete as the project's colour reference, but note that the UI
 *  deliberately draws on only two of these — see `UI_COLORS` below. */
export const JAPANESE_PALETTE = {
  shuiro: '#AE7C69', // 朱色 — vermillion, muted
  yamabukiiro: '#B09562', // 山吹色 — golden yellow, muted
  asagiiro: '#608B95', // 浅葱色 — light indigo / pale blue-green, muted
  wakatakeiro: '#789381', // 若竹色 — young bamboo green, muted
  fujiiro: '#89849B', // 藤色 — wisteria purple, muted
  edocha: '#9C7A5B', // 江戸茶 — muted Edo brown
  enjiiro: '#A15C56', // 臙脂色 — muted carmine/crimson
} as const;

/**
 * The interface's entire colour vocabulary, by role rather than by hue.
 *
 * The panel used to carry eight competing accents — five colour-coded section
 * titles plus separate hues for the file browser, keyword tags and export —
 * which made the chrome compete with the photograph being edited. Everything
 * interactive now shares one accent, and colour carries meaning again:
 * `accent` means "active or selected", `danger` means "this destroys
 * something". Section titles are deliberately neutral.
 *
 * Reach for these rather than `JAPANESE_PALETTE` directly, so a control can't
 * quietly reintroduce a ninth colour.
 */
export const UI_COLORS = {
  /** Active, selected, or otherwise live controls. */
  accent: JAPANESE_PALETTE.asagiiro,
  /** Destructive actions only — and the map pin, where red reads as
   *  cartographic convention rather than a warning. */
  danger: JAPANESE_PALETTE.enjiiro,
  /** Section titles and other structural labels (neutral-400). */
  heading: '#a1a1aa',
  /** Inactive borders/tracks (neutral-600). */
  muted: '#52525b',
} as const;
