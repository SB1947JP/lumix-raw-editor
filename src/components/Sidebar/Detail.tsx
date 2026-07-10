import { useEditParams } from '../../state/editParams';
import { SliderRow } from '../SliderRow';
import { Section } from './Section';
import { JAPANESE_PALETTE } from '../../lib/palette';

interface Props {
  forceOpenSignal?: number;
  forceOpenValue?: boolean;
}

export function Detail({ forceOpenSignal, forceOpenValue }: Props) {
  const { params, set } = useEditParams();
  return (
    <Section title="Detail" color={JAPANESE_PALETTE.wakatakeiro} forceOpenSignal={forceOpenSignal} forceOpenValue={forceOpenValue}>
      <SliderRow label="Sharpen" value={params.sharpen} min={0} max={100} onChange={(v) => set('sharpen', v)} />
    </Section>
  );
}
