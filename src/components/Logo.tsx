/** Simple "SRE" wordmark: a flat dark tile with a clean system-sans monogram. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="10" fill="#12141d" />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        fontWeight="600"
        fontSize="23"
        fill="#cbb997"
      >
        SRE
      </text>
    </svg>
  );
}
