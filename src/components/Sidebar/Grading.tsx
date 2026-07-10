import { useEditParams } from '../../state/editParams';
import { EditParams } from '../../types';
import { SliderRow } from '../SliderRow';
import { Section } from './Section';
import { JAPANESE_PALETTE } from '../../lib/palette';

/** Truthful swatch: the actual Oklab hue (at a fixed mid lightness/chroma)
 *  converted to sRGB, so the numeric hue slider has a visible colour. */
function oklchSwatch(hueDeg: number): string {
  const L = 0.72;
  const C = 0.13;
  const a = Math.cos((hueDeg * Math.PI) / 180) * C;
  const b = Math.sin((hueDeg * Math.PI) / 180) * C;
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const toS = (v: number) => {
    const c = Math.min(1, Math.max(0, v));
    return Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
  };
  return `rgb(${toS(lr)}, ${toS(lg)}, ${toS(lb)})`;
}

interface RangeProps {
  title: string;
  hueKey: keyof EditParams;
  strKey: keyof EditParams;
}

function GradeRange({ title, hueKey, strKey }: RangeProps) {
  const { params, set } = useEditParams();
  const hue = params[hueKey] as number;
  const str = params[strKey] as number;
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-block w-3 h-3 rounded-full border border-neutral-700"
          style={{ backgroundColor: str > 0 ? oklchSwatch(hue) : '#3f3f46' }}
        />
        <span className="text-[11px] uppercase tracking-wide text-neutral-500">{title}</span>
      </div>
      <SliderRow label="Hue" value={hue} min={0} max={360} onChange={(v) => set(hueKey, v)} />
      <SliderRow label="Strength" value={str} min={0} max={100} onChange={(v) => set(strKey, v)} />
    </div>
  );
}

interface Props {
  forceOpenSignal?: number;
  forceOpenValue?: boolean;
}

export function Grading({ forceOpenSignal, forceOpenValue }: Props) {
  return (
    <Section
      title="Colour Grading"
      color={JAPANESE_PALETTE.nakabeni}
      defaultOpen={false}
      forceOpenSignal={forceOpenSignal}
      forceOpenValue={forceOpenValue}
    >
      <GradeRange title="Shadows" hueKey="gradeShadowHue" strKey="gradeShadowStr" />
      <GradeRange title="Midtones" hueKey="gradeMidHue" strKey="gradeMidStr" />
      <GradeRange title="Highlights" hueKey="gradeHighlightHue" strKey="gradeHighlightStr" />
    </Section>
  );
}
