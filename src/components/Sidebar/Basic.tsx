import { useEditParams } from '../../state/editParams';
import { SliderRow } from '../SliderRow';
import { Section } from './Section';
import { ControlGroup } from './ControlGroup';

interface Props {
  forceOpenSignal?: number;
  forceOpenValue?: boolean;
}

export function Basic({ forceOpenSignal, forceOpenValue }: Props) {
  const { params, set } = useEditParams();

  return (
    <Section title="Basic" forceOpenSignal={forceOpenSignal} forceOpenValue={forceOpenValue}>
      <ControlGroup>
        <SliderRow label="Exposure" value={params.exposure} min={-5} max={5} step={0.05} onChange={(v) => set('exposure', v)} />
        <SliderRow label="Brightness" value={params.brightness} min={-100} max={100} onChange={(v) => set('brightness', v)} />
        <SliderRow label="Contrast" value={params.contrast} min={-100} max={100} onChange={(v) => set('contrast', v)} />
        <SliderRow label="Sharpen" value={params.sharpen} min={0} max={100} onChange={(v) => set('sharpen', v)} />
      </ControlGroup>
    </Section>
  );
}
