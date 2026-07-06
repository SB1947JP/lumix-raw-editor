import { ReactNode, useState } from 'react';

interface Props {
  title: string;
  color: string;
  children: ReactNode;
  /** Whether the section starts expanded (default true). */
  defaultOpen?: boolean;
}

export function Section({ title, color, children, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between mb-2 select-none group"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
          {title}
        </h3>
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`opacity-60 transition-transform group-hover:opacity-100 ${open ? '' : '-rotate-90'}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && children}
    </div>
  );
}
