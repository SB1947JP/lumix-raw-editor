import { useCallback, useEffect, useState } from 'react';

// Safari/older-WebKit still only expose the prefixed Fullscreen API, and iOS
// Safari exposes none of it on the document/element (only <video> can go
// fullscreen there). So we feature-detect both spellings and hide the control
// entirely where it genuinely can't work, rather than showing a dead button.
type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function fullscreenElement(): Element | null {
  const d = document as FsDocument;
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

function fullscreenSupported(): boolean {
  const el = document.documentElement as FsElement;
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function FullscreenButton({ className }: { className?: string }) {
  const [isFull, setIsFull] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(fullscreenSupported());
    const sync = () => setIsFull(fullscreenElement() != null);
    sync();
    // Both event names fire depending on the engine; listening to both is
    // harmless and keeps the icon in sync when the user leaves fullscreen via
    // Esc/F11 rather than the button.
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (fullscreenElement()) {
        const d = document as FsDocument;
        await (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.());
      } else {
        const el = document.documentElement as FsElement;
        await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
      }
    } catch {
      // A rejected request (e.g. not triggered by a user gesture, or blocked
      // by permissions policy) just means we stay windowed — nothing to do.
    }
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={isFull ? 'Exit full screen' : 'Full screen'}
      aria-label={isFull ? 'Exit full screen' : 'Enter full screen'}
      aria-pressed={isFull}
      className={`h-8 w-8 flex items-center justify-center rounded border font-medium text-neutral-400 border-neutral-700 hover:bg-neutral-900 ${className ?? ''}`}
    >
      <svg viewBox="0 0 16 16" className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {isFull ? (
          // Inward-pointing corners — "collapse / exit".
          <>
            <path d="M6 2v2.5a1.5 1.5 0 0 1-1.5 1.5H2" />
            <path d="M10 2v2.5A1.5 1.5 0 0 0 11.5 6H14" />
            <path d="M6 14v-2.5A1.5 1.5 0 0 0 4.5 10H2" />
            <path d="M10 14v-2.5a1.5 1.5 0 0 1 1.5-1.5H14" />
          </>
        ) : (
          // Outward-pointing corners — "expand / enter".
          <>
            <path d="M2 5.5V3a1 1 0 0 1 1-1h2.5" />
            <path d="M14 5.5V3a1 1 0 0 0-1-1h-2.5" />
            <path d="M2 10.5V13a1 1 0 0 0 1 1h2.5" />
            <path d="M14 10.5V13a1 1 0 0 1-1 1h-2.5" />
          </>
        )}
      </svg>
    </button>
  );
}
