import { useEffect, useRef, useState } from 'react';
import { useEditParams } from '../../state/editParams';
import { UI_COLORS } from '../../lib/palette';
import { FILM_STOCKS } from '../../lib/filmStocks';
import { CURVE_PRESETS } from '../../lib/curve';
import { EditParams } from '../../types';

interface Props {
  /** Label of the currently matched preset, or null when the params are custom. */
  selectedLabel: string | null;
  onPickFilm: (label: string) => void;
  onPickCurve: (label: string) => void;
}

/** The subset of params a film stock drives — colour plus its own tone curve. */
function filmPreview(label: string): Partial<EditParams> | null {
  const p = FILM_STOCKS.find((s) => s.label === label);
  if (!p) return null;
  return {
    temperature: p.temperature,
    tint: p.tint,
    saturation: p.saturation,
    vibrance: p.vibrance,
    contrast: p.contrast,
    lumaCurve: p.curve.map((pt) => ({ ...pt })),
  };
}

function curvePreview(label: string): Partial<EditParams> | null {
  const p = CURVE_PRESETS.find((s) => s.label === label);
  if (!p) return null;
  return { lumaCurve: p.points.map((pt) => ({ ...pt })) };
}

/**
 * Look picker with live hover preview.
 *
 * Deliberately not a native `<select>`: `<option>` elements can't receive
 * hover events in any browser, so previewing a stock by pointing at it is
 * impossible without owning the list. The list expands inline rather than
 * floating, which sidesteps being clipped by the panel's own scroll container
 * and keeps it usable in a narrow, resizable sidebar.
 *
 * Hovering writes to the store's `preview` layer, which the canvas renders on
 * top of the real params — nothing is committed, no undo step is recorded, and
 * export is unaffected until an item is actually clicked.
 */
export function LookPicker({ selectedLabel, onPickFilm, onPickCurve }: Props) {
  const setPreview = useEditParams((s) => s.setPreview);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // A preview must never outlive the pointer. Closing, unmounting, or the
  // window losing focus mid-hover all have to clear it, or the image would sit
  // showing a stock the user never chose.
  useEffect(() => {
    if (!open) setPreview(null);
  }, [open, setPreview]);
  useEffect(() => () => setPreview(null), [setPreview]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // Named so it can actually be removed — an inline arrow here would leak a
    // fresh listener every time the list opens.
    const onBlur = () => setPreview(null);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', onBlur);
    };
  }, [open, setPreview]);

  const groups = [
    {
      heading: 'Film',
      items: FILM_STOCKS.map((p) => p.label),
      preview: filmPreview,
      pick: onPickFilm,
    },
    {
      heading: 'Camera look / contrast',
      items: CURVE_PRESETS.map((p) => p.label),
      preview: curvePreview,
      pick: onPickCurve,
    },
  ];

  return (
    <div ref={rootRef} className="mb-3">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="A film stock (colour + its tone curve) or a camera-look / contrast curve"
        className="w-full flex items-center justify-between gap-2 bg-neutral-950 border border-neutral-700 rounded text-xs text-neutral-300 py-1 px-2 hover:border-neutral-600"
      >
        <span className="truncate">{selectedLabel ?? 'Custom'}</span>
        <svg viewBox="0 0 16 16" className="w-3 h-3 shrink-0 opacity-70" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 6.5 8 10.5l4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Look"
          // One clear on the container rather than per item: moving between two
          // adjacent items fires leave-then-enter, and clearing per item would
          // flash the un-previewed image between every row.
          onPointerLeave={() => setPreview(null)}
          className="mt-1 max-h-64 overflow-y-auto rounded border border-neutral-700 bg-neutral-950 py-1"
        >
          {groups.map((group) => (
            <div key={group.heading}>
              <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-neutral-500">{group.heading}</div>
              {group.items.map((label) => {
                const active = selectedLabel === label;
                return (
                  <button
                    key={label}
                    type="button"
                    role="option"
                    aria-selected={active}
                    // Pointer events, not mouse: this stays inert for touch,
                    // where there is no hover and a tap should simply select.
                    onPointerEnter={(e) => {
                      if (e.pointerType === 'touch') return;
                      setPreview(group.preview(label));
                    }}
                    onFocus={() => setPreview(group.preview(label))}
                    onClick={() => {
                      setPreview(null);
                      group.pick(label);
                      setOpen(false);
                    }}
                    className="w-full text-left px-2 py-1 text-xs hover:bg-neutral-800"
                    style={active ? { color: UI_COLORS.accent } : { color: '#d4d4d8' }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {open && (
        <p className="mt-1 text-[10px] leading-snug text-neutral-600">Hover to preview on the photo · click to apply</p>
      )}
    </div>
  );
}
