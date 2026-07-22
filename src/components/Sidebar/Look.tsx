import { useEditParams } from '../../state/editParams';
import { Section } from './Section';
import { CurveEditor } from '../CurveEditor';
import { LookPicker } from './LookPicker';
import { FILM_STOCKS, matchFilmStock } from '../../lib/filmStocks';
import { CURVE_PRESETS, matchCurvePreset, isIdentityCurve, normalizeCurve } from '../../lib/curve';
import { DEFAULT_EDIT_PARAMS } from '../../types';

interface Props {
  forceOpenSignal?: number;
  forceOpenValue?: boolean;
}

export function Look({ forceOpenSignal, forceOpenValue }: Props) {
  const { params, set, beginChange } = useEditParams();

  // Derive the selection from the params themselves: a film match (colour +
  // curve) wins the label over a curve-only match; anything else is "Custom".
  const matchedFilmStock = matchFilmStock(params);
  // Normalized so CurveEditor (plain array ops, not the guarded helpers in
  // lib/curve.ts) never receives a missing/malformed value.
  const curvePoints = normalizeCurve(params.lumaCurve);
  const matchedCurve = matchCurvePreset(curvePoints);

  return (
    <Section title="Look" forceOpenSignal={forceOpenSignal} forceOpenValue={forceOpenValue}>
      {/* One control instead of two dropdowns fighting over the tone curve: the
          Film group applies a full stock (colour + its curve), the Camera look
          / contrast group applies a curve only. */}
      <LookPicker
        selectedLabel={matchedFilmStock?.label ?? matchedCurve?.label ?? null}
        onPickFilm={(label) => {
          const preset = FILM_STOCKS.find((p) => p.label === label);
          if (!preset) return;
          beginChange();
          set('temperature', preset.temperature);
          set('tint', preset.tint);
          set('saturation', preset.saturation);
          set('vibrance', preset.vibrance);
          set('contrast', preset.contrast);
          set('lumaCurve', preset.curve.map((p) => ({ ...p })));
        }}
        onPickCurve={(label) => {
          const preset = CURVE_PRESETS.find((p) => p.label === label);
          if (!preset) return;
          beginChange();
          set('lumaCurve', preset.points.map((p) => ({ ...p })));
        }}
      />

      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-neutral-400">Tone Curve</div>
        <button
          onClick={() => {
            if (isIdentityCurve(curvePoints)) return;
            beginChange();
            set('lumaCurve', DEFAULT_EDIT_PARAMS.lumaCurve.map((p) => ({ ...p })));
          }}
          title="Reset the curve to linear"
          className="text-xs text-neutral-400 border border-neutral-700 rounded px-2 py-1 hover:bg-neutral-900 disabled:opacity-30"
          disabled={isIdentityCurve(curvePoints)}
        >
          Reset
        </button>
      </div>
      <CurveEditor points={curvePoints} onBeginChange={beginChange} onChange={(next) => set('lumaCurve', next)} />
      <p className="mt-1.5 text-[10px] leading-snug text-neutral-600">
        Drag to bend · click to add a point · double-click a point to remove
      </p>
    </Section>
  );
}
