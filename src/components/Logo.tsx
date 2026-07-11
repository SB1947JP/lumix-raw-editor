/** "SRE" wordmark, echoing the dashed/dotted hexagonal wireframe style of the
 *  reference logo: a dark tile with a dashed border and a bold cream monogram.
 *  Kept simple (no fine dot texture) so it still reads at favicon sizes. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="10" fill="#12141d" stroke="#cbb997" strokeWidth="1" strokeDasharray="3 2" />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="800"
        fontSize="23"
        letterSpacing="0.5"
        fill="#cbb997"
      >
        SRE
      </text>
    </svg>
  );
}
