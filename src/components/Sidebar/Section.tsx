import { ReactNode } from 'react';

interface Props {
  title: string;
  color: string;
  children: ReactNode;
}

export function Section({ title, color, children }: Props) {
  return (
    <div className="mb-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
