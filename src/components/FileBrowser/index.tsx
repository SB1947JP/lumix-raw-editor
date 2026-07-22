import { DragEvent as ReactDragEvent, useEffect, useRef, useState } from 'react';
import { allKeywords, filterItems, useLibrary } from '../../state/library';
import { friendlyDecodeError, isSupportedRawFile, probeFile } from '../../lib/rawDecoder';
import { UI_COLORS } from '../../lib/palette';
import { KeywordEditor } from './KeywordEditor';
import { MapView } from './MapView';

/**
 * Fills in each newly added file's thumbnail and metadata, one at a time.
 *
 * Strictly sequential on purpose: every probe spins up a LibRaw WebAssembly
 * worker, so fanning out across a 200-photo folder would try to hold 200 wasm
 * heaps at once. One at a time keeps memory flat and still feels immediate,
 * because a thumbnail probe never demosaics the sensor data.
 */
function useProbeQueue() {
  const items = useLibrary((s) => s.items);
  const pumpingRef = useRef(false);
  const disposedRef = useRef(false);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (pumpingRef.current) return;
    pumpingRef.current = true;
    void (async () => {
      try {
        for (;;) {
          // Read through getState() rather than the captured `items`: the loop
          // outlives the render it started in, and must see files added while
          // it was already running.
          const { items: current, markProbed, markFailed } = useLibrary.getState();
          const next = current.find((i) => i.status === 'pending');
          if (!next || disposedRef.current) break;
          try {
            const bytes = new Uint8Array(await next.file.arrayBuffer());
            const probe = await probeFile(bytes);
            if (disposedRef.current) {
              if (probe.thumbnailUrl) URL.revokeObjectURL(probe.thumbnailUrl);
              break;
            }
            markProbed(next.id, probe.thumbnailUrl, probe.metadata);
          } catch (err) {
            // One unreadable file must not stall the rest of the folder.
            markFailed(next.id, friendlyDecodeError(err));
          }
        }
      } finally {
        pumpingRef.current = false;
      }
    })();
  }, [items]);
}

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
}

export function FileBrowser() {
  const items = useLibrary((s) => s.items);
  const selectedId = useLibrary((s) => s.selectedId);
  const search = useLibrary((s) => s.search);
  const activeKeywords = useLibrary((s) => s.activeKeywords);
  const keywords = useLibrary((s) => s.keywords);
  const addFiles = useLibrary((s) => s.addFiles);
  const select = useLibrary((s) => s.select);
  const remove = useLibrary((s) => s.remove);
  const clear = useLibrary((s) => s.clear);
  const setSearch = useLibrary((s) => s.setSearch);
  const toggleKeywordFilter = useLibrary((s) => s.toggleKeywordFilter);
  const hydrateKeywords = useLibrary((s) => s.hydrateKeywords);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useProbeQueue();

  useEffect(() => {
    void hydrateKeywords();
  }, [hydrateKeywords]);

  const ingest = (fileList: FileList | null) => {
    if (!fileList) return;
    // A picked folder contains everything — JPEGs, sidecars, .DS_Store — so
    // filter to things that could plausibly be RAW before listing them.
    addFiles(Array.from(fileList).filter((f) => isSupportedRawFile(f.name)));
  };

  const onDrop = (e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    ingest(e.dataTransfer.files);
  };

  const visible = filterItems(items, search, activeKeywords, keywords);
  const vocabulary = allKeywords(keywords);
  const selected = items.find((i) => i.id === selectedId) ?? null;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      // A dashed outline while dragging is the only chrome this needs now that
      // it lives inside the editing panel's own frame.
      className={`rounded ${dragOver ? 'outline-dashed outline-1 outline-neutral-500' : ''}`}
    >

      {/* Two inputs because `webkitdirectory` turns the picker into a
          folder-only chooser — keeping a plain multi-file input alongside it
          means individual files can still be added from anywhere. */}
      <input
        ref={folderInputRef}
        type="file"
        // React types don't know these non-standard folder-picker attributes,
        // which every current browser nonetheless honours.
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
        multiple
        className="hidden"
        onChange={(e) => {
          ingest(e.target.files);
          e.target.value = ''; // let the same folder be re-picked later
        }}
      />
      <input
        ref={filesInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          ingest(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="flex gap-1.5 mb-2">
        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          className="flex-1 text-[11px] text-neutral-300 border border-neutral-700 rounded py-1.5 hover:bg-neutral-800"
        >
          Add folder
        </button>
        <button
          type="button"
          onClick={() => filesInputRef.current?.click()}
          className="flex-1 text-[11px] text-neutral-300 border border-neutral-700 rounded py-1.5 hover:bg-neutral-800"
        >
          Add files
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          Add a folder of RAW files, or drag them here, to browse and tag them. Files are read in your browser only —
          nothing is uploaded.
        </p>
      ) : (
        <>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search file names"
            aria-label="Search file names"
            className="w-full mb-2 bg-neutral-950 border border-neutral-700 rounded text-xs text-neutral-200 placeholder:text-neutral-600 py-1 px-2 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />

          {vocabulary.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {vocabulary.map((kw) => {
                const on = activeKeywords.includes(kw);
                return (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => toggleKeywordFilter(kw)}
                    aria-pressed={on}
                    className="px-1.5 py-0.5 rounded text-[10px] border transition-colors"
                    style={{
                      borderColor: on ? UI_COLORS.accent : '#3f3f46',
                      backgroundColor: on ? 'rgba(96,139,149,0.18)' : 'transparent',
                      color: on ? UI_COLORS.accent : '#a1a1aa',
                    }}
                  >
                    {kw}
                  </button>
                );
              })}
            </div>
          )}

          <ul className="space-y-1 mb-3">
            {visible.map((item) => {
              const isSelected = item.id === selectedId;
              const tags = keywords[item.name] ?? [];
              return (
                <li key={item.id}>
                  <div
                    className={`group w-full flex items-center gap-2 p-1 rounded border transition-colors ${
                      isSelected ? 'bg-neutral-800' : 'border-transparent hover:bg-neutral-800/60 hover:border-neutral-700'
                    }`}
                    style={isSelected ? { borderColor: UI_COLORS.accent } : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => select(item.id)}
                      aria-current={isSelected}
                      className="flex-1 min-w-0 flex items-center gap-2 text-left"
                    >
                      <span className="w-10 h-10 shrink-0 rounded-sm bg-neutral-950 border border-neutral-700 overflow-hidden flex items-center justify-center">
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] text-neutral-600">
                            {item.status === 'error' ? '!' : '…'}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] text-neutral-200 truncate" title={item.name}>
                          {item.name}
                        </span>
                        <span className="block text-[10px] text-neutral-500 truncate">
                          {item.status === 'error'
                            ? 'Unreadable'
                            : [formatSize(item.size), item.metadata?.gps ? '📍' : null, tags.length ? `${tags.length} tag${tags.length > 1 ? 's' : ''}` : null]
                                .filter(Boolean)
                                .join(' · ')}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      title={`Remove ${item.name} from the list`}
                      aria-label={`Remove ${item.name} from the list`}
                      className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-neutral-600 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-neutral-700 hover:text-neutral-200"
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {visible.length === 0 && (
            <p className="text-[11px] text-neutral-500 mb-3">No files match the current search or keyword filter.</p>
          )}

          <button
            type="button"
            onClick={clear}
            className="w-full text-[11px] text-neutral-500 border border-neutral-800 rounded py-1 hover:bg-neutral-800 hover:text-neutral-300 mb-3"
          >
            Clear list
          </button>
        </>
      )}

      {selected && (
        <div className="border-t border-neutral-800 pt-3 space-y-3">
          <KeywordEditor fileName={selected.name} />
          <div>
            <div className="text-[11px] uppercase tracking-wide text-neutral-500 mb-1.5">Location</div>
            {selected.metadata?.gps ? (
              <MapView gps={selected.metadata.gps} fileName={selected.name} />
            ) : (
              <p className="text-[11px] text-neutral-500">
                {selected.status === 'pending'
                  ? 'Reading metadata…'
                  : 'This photo has no GPS coordinates recorded.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
