import { useEditParams } from '../../state/editParams';
import { SliderRow } from '../SliderRow';
import { Section } from './Section';
import { RATIO_PRESETS, RatioPreset, resolveLockedAspect, useCropTool } from '../../state/cropTool';
import { computeAutoCropForRotation, fitAspectInRect, intersectCropRects, isFullFrame } from '../../lib/autoCrop';
import { JAPANESE_PALETTE } from '../../lib/palette';
import { CropRect } from '../../types';

const FULL_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 };

interface Props {
  imageWidth: number;
  imageHeight: number;
  forceOpenSignal?: number;
  forceOpenValue?: boolean;
}

/** Reshapes a crop rect to a locked aspect ratio, keeping its center fixed. */
function reshapeToRatio(crop: CropRect, lockedAspect: number, imageWidth: number, imageHeight: number): CropRect {
  const centerX = crop.x + crop.width / 2;
  const centerY = crop.y + crop.height / 2;
  let width = crop.width;
  let height = (imageWidth * width) / lockedAspect / imageHeight;
  if (height > 1) {
    height = 1;
    width = (imageHeight * height * lockedAspect) / imageWidth;
  }
  const x = Math.min(Math.max(centerX - width / 2, 0), 1 - width);
  const y = Math.min(Math.max(centerY - height / 2, 0), 1 - height);
  return { x, y, width, height };
}

export function Geometry({ imageWidth, imageHeight, forceOpenSignal, forceOpenValue }: Props) {
  const { params, set, beginChange } = useEditParams();
  const { ratio, orientation, autoRotationCrop, setRatio, toggleOrientation, setAutoRotationCrop } = useCropTool();
  const crop = params.crop ?? FULL_CROP;
  const cropEnabled = params.crop !== null;

  const applyLockedAspect = (lockedAspect: number | null) => {
    if (lockedAspect) {
      beginChange();
      setAutoRotationCrop(false);
      set('crop', reshapeToRatio(crop, lockedAspect, imageWidth, imageHeight));
    }
  };

  const handleRotationChange = (newRotation: number) => {
    set('rotation', newRotation);
    const safeCrop = computeAutoCropForRotation(imageWidth, imageHeight, newRotation);
    const lockedAspect = resolveLockedAspect(ratio, orientation, imageWidth, imageHeight);
    if (autoRotationCrop) {
      // Track the ideal "no smudged corners" rectangle as the angle changes.
      // With a locked ratio, keep that exact aspect and just shrink the largest
      // such rectangle to fit the safe zone — otherwise the crop's ratio would
      // drift with the rotation angle. Free ratio uses the safe rect as-is.
      const target = lockedAspect
        ? fitAspectInRect(safeCrop, lockedAspect, imageWidth, imageHeight)
        : safeCrop;
      set('crop', isFullFrame(target) ? null : target);
    } else if (params.crop) {
      // The user already has a manual crop: shrink it to stay inside the safe
      // zone, but preserve a locked aspect ratio rather than letting the
      // intersection distort it.
      const clipped = intersectCropRects(params.crop, safeCrop);
      set('crop', lockedAspect ? fitAspectInRect(clipped, lockedAspect, imageWidth, imageHeight) : clipped);
    }
  };

  return (
    <Section title="Geometry" color={JAPANESE_PALETTE.fujiiro} forceOpenSignal={forceOpenSignal} forceOpenValue={forceOpenValue}>
      <SliderRow label="Rotation" value={params.rotation} min={-45} max={45} step={0.1} onChange={handleRotationChange} />
      <label className="flex items-center gap-2 text-xs text-neutral-400 mb-3 select-none">
        <input
          type="checkbox"
          checked={cropEnabled}
          onChange={(e) => {
            beginChange();
            setAutoRotationCrop(false);
            set('crop', e.target.checked ? { ...FULL_CROP } : null);
          }}
        />
        Crop
      </label>
      {cropEnabled && (
        <div className="flex items-center gap-2 mb-1">
          <select
            value={String(ratio)}
            onChange={(e) => {
              const value = e.target.value;
              const next: RatioPreset = value === 'free' || value === 'original' ? value : Number(value);
              setRatio(next);
              applyLockedAspect(resolveLockedAspect(next, orientation, imageWidth, imageHeight));
            }}
            className="flex-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-neutral-300 py-1 px-2"
          >
            {RATIO_PRESETS.map((p) => (
              <option key={p.label} value={String(p.value)}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              toggleOrientation();
              const nextOrientation = orientation === 'landscape' ? 'portrait' : 'landscape';
              applyLockedAspect(resolveLockedAspect(ratio, nextOrientation, imageWidth, imageHeight));
            }}
            disabled={ratio === 'free'}
            title="Swap orientation"
            className="text-xs text-neutral-400 border border-neutral-700 rounded px-2 py-1 hover:bg-neutral-900 disabled:opacity-30"
          >
            ⇄
          </button>
        </div>
      )}
    </Section>
  );
}
