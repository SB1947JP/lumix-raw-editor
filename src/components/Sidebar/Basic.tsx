import { useEditParams } from '../../state/editParams';
import { SliderRow } from '../SliderRow';
import { Section } from './Section';
import { ControlGroup } from './ControlGroup';
import { computeAutoLevels } from '../../lib/autoLevels';
import { DecodedImage } from '../../types';

interface Props {
  image: DecodedImage | null;
  forceOpenSignal?: number;
  forceOpenValue?: boolean;
}

export function Basic({ image, forceOpenSignal, forceOpenValue }: Props) {
  const { params, set, beginChange } = useEditParams();

  const handleAutoLevels = () => {
    if (!image) return;
    const { exposure, blacks } = computeAutoLevels(image, params.tonemapMode);
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
    <Section title="Basic" forceOpenSignal={forceOpenSignal} forceOpenValue={forceOpenValue}>
      <button
        onClick={handleAutoLevels}
        disabled={!image}
        title={image ? undefined : 'Open a RAW file to use Auto Levels'}
        className="mb-3 w-full text-xs text-neutral-300 border border-neutral-700 rounded py-1.5 hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
      >
        Auto Levels
      </button>

      <ControlGroup>
        <SliderRow label="Exposure" value={params.exposure} min={-5} max={5} step={0.05} onChange={(v) => set('exposure', v)} />
        <SliderRow label="Brightness" value={params.brightness} min={-100} max={100} onChange={(v) => set('brightness', v)} />
        <SliderRow label="Contrast" value={params.contrast} min={-100} max={100} onChange={(v) => set('contrast', v)} />
        <SliderRow label="Sharpen" value={params.sharpen} min={0} max={100} onChange={(v) => set('sharpen', v)} />
      </ControlGroup>
    </Section>
  );
}
