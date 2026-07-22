import { useState } from 'react';
import { useLibrary } from '../../state/library';
import { ACCENT_BORDER, UI_COLORS } from '../../lib/palette';

/** Tag editor for one file. Keywords are stored locally and never written
 *  into the RAW itself — see lib/keywordStore.ts. */
export function KeywordEditor({ fileName }: { fileName: string }) {
  const tags = useLibrary((s) => s.keywords[fileName]) ?? [];
  const addKeyword = useLibrary((s) => s.addKeyword);
  const removeKeyword = useLibrary((s) => s.removeKeyword);
  const [draft, setDraft] = useState('');

  const commit = () => {
    // Comma-separated entry so a burst of tags can be typed in one go.
    for (const part of draft.split(',')) addKeyword(fileName, part);
    setDraft('');
  };

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-neutral-500 mb-1.5">Keywords</div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded text-[11px] border"
              style={{ borderColor: ACCENT_BORDER, color: UI_COLORS.accent }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeKeyword(fileName, tag)}
                title={`Remove keyword "${tag}"`}
                aria-label={`Remove keyword ${tag}`}
                className="w-3.5 h-3.5 flex items-center justify-center rounded-sm hover:bg-neutral-700 hover:text-neutral-100 leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        // Commit on blur too, so a typed-but-not-Entered tag isn't silently
        // lost when the user clicks straight onto another photo.
        onBlur={commit}
        placeholder="Add keyword, press Enter"
        aria-label={`Add a keyword to ${fileName}`}
        className="w-full bg-neutral-950 border border-neutral-700 rounded text-xs text-neutral-200 placeholder:text-neutral-600 py-1 px-2 focus:outline-none focus:ring-1 focus:ring-neutral-500"
      />
    </div>
  );
}
