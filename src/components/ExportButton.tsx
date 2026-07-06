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
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: outName });
        } catch (shareErr) {
          if (shareErr instanceof Error && shareErr.name === 'AbortError') return;
          throw shareErr;
        }
        return;
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
