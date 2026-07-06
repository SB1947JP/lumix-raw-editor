import { useState } from 'react';
import { JAPANESE_PALETTE } from '../lib/palette';

interface Props {
  before: Uint32Array | null;
  after: Uint32Array | null;
}

type Mode = 'before' | 'after';

const COLORS: Record<Mode, string> = {
  before: JAPANESE_PALETTE.shuiro,
  after: JAPANESE_PALETTE.asagiiro,
};

export function Histogram({ before, after }: Props) {
  const [mode, setMode] = useState<Mode>('after');
  const buckets = mode === 'before' ? before : after;
  const color = COLORS[mode];

  const max = buckets ? Math.max(1, ...buckets) : 1;
  const points = buckets
    ? Array.from(buckets)
        .map((count, i) => `${(i / 255) * 100},${100 - (count / max) * 100}`)
        .join(' ')
    : '';

  // Quarter-tone gridlines/labels give the 0–255 chart a readable scale
  // (shadows → highlights) so bucket positions can be judged, not just shape.
  const TICKS = [0, 64, 128, 192, 255];

  return (
    <div>
      {buckets ? (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-16 w-full rounded bg-neutral-950">
          {TICKS.slice(1, -1).map((t) => (
            <line
              key={t}
              x1={(t / 255) * 100}
              y1={0}
              x2={(t / 255) * 100}
              y2={100}
              stroke="#3f3f46"
              strokeWidth={0.4}
            />
          ))}
          <polyline points={`0,100 ${points} 100,100`} fill={color} fillOpacity={0.45} stroke="none" />
        </svg>
      ) : (
        <div className="h-16 w-full rounded bg-neutral-950" />
      )}
      <div className="flex justify-between mt-0.5 px-0.5 text-[9px] tabular-nums text-neutral-600">
        {TICKS.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="flex mt-1 gap-1">
        {(['before', 'after'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-0.5 rounded text-[10px] uppercase tracking-wide font-medium"
            style={{
              color: mode === m ? COLORS[m] : '#71717a',
              backgroundColor: mode === m ? `${COLORS[m]}22` : 'transparent',
            }}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
