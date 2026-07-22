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
 * This has been narrowed twice. The panel first carried eight competing
 * accents — five colour-coded section titles plus separate hues for the file
 * browser, keyword tags and export — which was cut to a single accent plus a
 * red for destructive actions. That single accent was still one colour too
 * many: it painted fifteen controls, and the loudest of them (Export JPEG,
 * the Dial Mixer toggle) put a teal-green next to a photograph that already
 * had colour of its own to say.
 *
 * So `accent` is now a *brightness*, not a hue. "Active" and "selected" are
 * signalled the way a black-and-white darkroom print signals emphasis —
 * contrast and weight — leaving the photograph as the only thing in the
 * window with a colour. `danger` is the one exception, because a control that
 * destroys something should not rely on being merely brighter.
 *
 * Reach for these rather than `JAPANESE_PALETTE` directly, so a control can't
 * quietly reintroduce a hue.
 */
export const UI_COLORS = {
  /** Active, selected, or otherwise live controls (neutral-200). One step
   *  brighter than a resting label and no more: pure white read as a
   *  highlight shouting for attention, which is the same mistake the eight
   *  accents made, just in monochrome. The gap only has to be legible, not
   *  loud. */
  accent: '#e4e4e7',
  /** Destructive actions. Kept in the vocabulary for the map pin, where red
   *  is cartographic convention rather than a warning — Delete file itself is
   *  drawn in the same neutral as every other control now. */
  danger: JAPANESE_PALETTE.enjiiro,
  /** Section titles and other structural labels (neutral-400). */
  heading: '#a1a1aa',
  /** Inactive borders/tracks (neutral-600). */
  muted: '#52525b',
} as const;

/** Outline of an active control. The accent at full strength made a hard
 *  white box around anything live; at ~40% it still separates from the
 *  inactive `muted` border without ringing. */
export const ACCENT_BORDER = 'rgba(228,228,231,0.4)';

/** The wash behind an active control. A tint of the accent, not a colour —
 *  keep it in step with `accent`. Barely there on purpose: it should say
 *  "this one is on" at a glance and disappear again. */
export const ACCENT_WASH = 'rgba(228,228,231,0.07)';
