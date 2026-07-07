import { useState } from 'react';
import { JAPANESE_PALETTE } from '../lib/palette';
import { HistogramData } from '../lib/histogram';

interface Props {
  before: HistogramData | null;
  after: HistogramData | null;
}

type Mode = 'before' | 'after';

const TAB_COLORS: Record<Mode, string> = {
  before: JAPANESE_PALETTE.shuiro,
  after: JAPANESE_PALETTE.asagiiro,
};

const CHANNELS = [
  { key: 'r', color: '#ef4444' },
  { key: 'g', color: '#22c55e' },
  { key: 'b', color: '#3b82f6' },
] as const;

function toPoints(buckets: Uint32Array, max: number): string {
  return Array.from(buckets)
    .map((count, i) => `${(i / 255) * 100},${100 - (count / max) * 100}`)
    .join(' ');
}

export function Histogram({ before, after }: Props) {
  const [mode, setMode] = useState<Mode>('after');
  const data = mode === 'before' ? before : after;

  // One shared max across R/G/B so the channels are comparable — this is what
  // makes per-channel clipping visible as a spike hitting an edge.
  const max = data ? Math.max(1, ...data.r, ...data.g, ...data.b) : 1;

  // Quarter-tone gridlines/labels give the 0–255 chart a readable scale
  // (shadows → highlights) so bucket positions can be judged, not just shape.
  const TICKS = [0, 64, 128, 192, 255];

  return (
    <div>
      {data ? (
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
          <polyline
            points={`0,100 ${toPoints(data.luma, max)} 100,100`}
            fill="#a3a3a3"
            fillOpacity={0.18}
            stroke="none"
          />
          {CHANNELS.map(({ key, color }) => (
            <polyline
              key={key}
              points={`0,100 ${toPoints(data[key], max)} 100,100`}
              fill={color}
              fillOpacity={0.3}
              stroke={color}
              strokeOpacity={0.6}
              strokeWidth={0.5}
              style={{ mixBlendMode: 'screen' }}
            />
          ))}
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
              color: mode === m ? TAB_COLORS[m] : '#71717a',
              backgroundColor: mode === m ? `${TAB_COLORS[m]}22` : 'transparent',
            }}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
