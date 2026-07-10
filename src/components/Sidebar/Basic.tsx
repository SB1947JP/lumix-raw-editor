import { useEditParams } from '../../state/editParams';
import { SliderRow } from '../SliderRow';
import { Section } from './Section';
import { computeAutoLevels } from '../../lib/autoLevels';
import { JAPANESE_PALETTE } from '../../lib/palette';
import { DecodedImage } from '../../types';

interface Props {
  image: DecodedImage;
}

export function Basic({ image }: Props) {
  const { params, set, beginChange } = useEditParams();

  const handleAutoLevels = () => {
    const { exposure, blacks } = computeAutoLevels(image);
    beginChange();
    set('exposure', exposure);
    set('blacks', blacks);
    set('contrast', 0);
    set('highlights', 0);
    set('shadows', 0);
    set('whites', 0);
    set('brightness', 0);
  };

  return (
    <Section title="Basic" color={JAPANESE_PALETTE.shuiro}>
      <div className="mb-3">
        <div className="text-xs text-neutral-400 mb-1">Tone Mapper</div>
        <select
          value={params.tonemapMode}
          onChange={(e) => {
            beginChange();
            set('tonemapMode', e.target.value as typeof params.tonemapMode);
          }}
          title="How highlights roll off to white. AgX (Blender's filmic view transform) desaturates extreme highlights gracefully toward white instead of clipping to a harsh colour."
          className="w-full bg-neutral-950 border border-neutral-700 rounded text-xs text-neutral-300 py-1 px-2"
        >
          <option value="classic">Classic</option>
          <option value="agx">AgX (filmic)</option>
        </select>
      </div>
      <button
        onClick={handleAutoLevels}
        className="mb-3 w-full text-xs text-neutral-300 border border-neutral-700 rounded py-1.5 hover:bg-neutral-800"
      >
        Auto Levels
      </button>
      <SliderRow label="Exposure" value={params.exposure} min={-5} max={5} step={0.05} onChange={(v) => set('exposure', v)} />
      <SliderRow label="Brightness" value={params.brightness} min={-100} max={100} onChange={(v) => set('brightness', v)} />
      <SliderRow label="Contrast" value={params.contrast} min={-100} max={100} onChange={(v) => set('contrast', v)} />
    </Section>
  );
}
