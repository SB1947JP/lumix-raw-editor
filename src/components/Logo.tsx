/** "SRE" wordmark badge, sized and shaped to match the header action buttons
 *  (same height, padding and rounding) so it reads as part of the set rather
 *  than a faint little tile. A subtle cream border defines its shape against
 *  the near-black header. */
export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={`h-8 px-2.5 flex items-center justify-center rounded border font-bold text-sm tracking-wide select-none ${className ?? ''}`}
      style={{ backgroundColor: '#12141d', borderColor: 'rgba(203,185,151,0.5)', color: '#cbb997' }}
      aria-label="Sean's RAW Editor"
    >
      SRE
    </div>
  );
}
