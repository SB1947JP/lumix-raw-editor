import { PointerEvent as ReactPointerEvent, useRef } from 'react';
import { useEditParams } from '../state/editParams';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function SliderRow({ label, value, min, max, step = 1, defaultValue = 0, disabled = false, onChange }: Props) {
  const beginChange = useEditParams((s) => s.beginChange);
  // Native dblclick is unreliable here: it's mouse-only (never fires for a
  // double-tap on touch/pen), and doesn't play well with setPointerCapture
  // below. Detecting the double-press ourselves (same pattern as
  // CurveEditor's reset-on-double-click) works uniformly across input types.
  const lastDownRef = useRef(0);

  const handleReset = () => {
    if (value === defaultValue) return;
    beginChange();
    onChange(defaultValue);
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLInputElement>) => {
    const now = Date.now();
    const isDoubleClick = now - lastDownRef.current < 300;
    lastDownRef.current = now;
    if (isDoubleClick) {
      // Stop the native range input from also jumping the value to this
      // click's position before our reset applies.
      e.preventDefault();
      handleReset();
      return;
    }
    // Capture the pointer so every subsequent move is delivered to this slider
    // even if the finger/Pencil drifts off it — otherwise iPadOS can hand a
    // straying drag to page-scroll or Scribble mid-adjustment.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    beginChange();
  };

  // A centre "0" tick only makes sense on bipolar sliders (those whose default
  // sits strictly inside the range, e.g. −100..100). For 0-based sliders like
  // Sharpen the default is the left edge, where a tick would be meaningless.
  const showTick = defaultValue > min && defaultValue < max;
  const tickPct = ((defaultValue - min) / (max - min)) * 100;

  return (
    <label className={`block mb-3 text-xs text-neutral-400 select-none ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex justify-between mb-1">
        <span>{label}</span>
        <span className="text-neutral-500 tabular-nums">{value}</span>
      </div>
      <div className="relative flex items-center h-5">
        {/* Track (drawn here so the tick can sit on it, beneath the thumb). */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-[#3f3f46]" />
        {showTick && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 w-0.5 h-2.5 rounded-full bg-neutral-500"
            style={{ left: `calc(${tickPct}% - 1px)` }}
          />
        )}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onPointerDown={handlePointerDown}
          onChange={(e) => onChange(Number(e.target.value))}
          title={`Double-click/tap to reset to ${defaultValue}`}
          className="relative w-full disabled:cursor-not-allowed"
        />
      </div>
    </label>
  );
}
