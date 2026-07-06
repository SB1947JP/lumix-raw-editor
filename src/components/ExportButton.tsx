import { useState } from 'react';
import { decodeFull } from '../lib/rawDecoder';
import { RawRenderer } from '../gl/renderer';
import { JAPANESE_PALETTE } from '../lib/palette';
import { EditParams } from '../types';

interface Props {
  fileBytes: Uint8Array<ArrayBuffer>;
  fileName: string;
  params: EditParams;
}

// Desktop Chromium browsers (Vivaldi, Chrome, Edge, …) also implement
// navigator.share/canShare for files, so gating on feature-detection alone
// routes them to the mobile-style share sheet instead of their normal
// download flow. The share sheet is only actually needed on iOS/iPadOS,
// where blob-URL anchor downloads don't reliably save anywhere — so detect
// that platform specifically rather than just checking API availability.
// iPadOS reports as "MacIntel" but exposes touch points, unlike a real Mac.
function isIOS(): boolean {
  return /iP(hone|od|ad)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function ExportButton({ fileBytes, fileName, params }: Props) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const { image } = await decodeFull(fileBytes);
      const canvas = document.createElement('canvas');
      const renderer = new RawRenderer(canvas);
      renderer.setImage(image);
      renderer.render(params);
      const blob = await renderer.toBlob('image/jpeg', 0.92);
      renderer.dispose();
      if (!blob) throw new Error('Export failed');

      const outName = `${fileName.replace(/\.[^.]+$/, '')}_edited.jpg`;
      const file = new File([blob], outName, { type: 'image/jpeg' });

      // iOS/iPadOS Safari doesn't reliably trigger a file-save dialog for
      // anchor[download] with blob URLs — it just opens the image in-place
      // with no way to pick a destination. The Web Share API instead opens
      // the native share sheet, which includes "Save to Files"/"Save Image".
      if (isIOS() && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: outName });
          return;
        } catch (shareErr) {
          if (shareErr instanceof Error && shareErr.name === 'AbortError') return;
          // Safari only allows share() while still inside the click's "user
          // activation" window, which the awaited decode/render above has
          // already used up by the time we get here — it rejects with
          // NotAllowedError rather than actually prompting. There's no way
          // to keep activation alive across an async decode, so just fall
          // through to the anchor-download path below instead of failing.
          if (!(shareErr instanceof Error && shareErr.name === 'NotAllowedError')) throw shareErr;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-400">{error}</span>}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="px-2.5 py-1 text-xs rounded border font-medium disabled:opacity-50 hover:bg-neutral-900"
        style={{ borderColor: JAPANESE_PALETTE.shuiro, color: JAPANESE_PALETTE.shuiro }}
      >
        {exporting ? 'Exporting…' : 'Export JPEG'}
      </button>
    </div>
  );
}
