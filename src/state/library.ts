import { create } from 'zustand';
import { RawMetadata } from '../types';
import { loadAllKeywords, normalizeKeyword, saveKeywords } from '../lib/keywordStore';

export interface LibraryItem {
  /** Stable across re-adding the same folder: name + size + mtime. */
  id: string;
  name: string;
  size: number;
  file: File;
  /** 'pending' until the cheap metadata/thumbnail probe has run for this file. */
  status: 'pending' | 'ready' | 'error';
  thumbnailUrl: string | null;
  metadata: RawMetadata | null;
  error?: string;
}

interface LibraryStore {
  items: LibraryItem[];
  selectedId: string | null;
  /** Free-text filter over file names. */
  search: string;
  /** Only show files carrying every one of these keywords. */
  activeKeywords: string[];
  keywords: Record<string, string[]>;

  addFiles: (files: File[]) => LibraryItem[];
  markProbed: (id: string, thumbnailUrl: string | null, metadata: RawMetadata) => void;
  markFailed: (id: string, error: string) => void;
  select: (id: string | null) => void;
  remove: (id: string) => void;
  clear: () => void;

  setSearch: (search: string) => void;
  toggleKeywordFilter: (keyword: string) => void;
  clearKeywordFilters: () => void;

  hydrateKeywords: () => Promise<void>;
  addKeyword: (fileName: string, raw: string) => void;
  removeKeyword: (fileName: string, keyword: string) => void;
}

/** The library's identity for a file. Exported so the main dropzone can select
 *  the item it just added without having to guess at the id scheme. */
export function libraryIdFor(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export const useLibrary = create<LibraryStore>((set, get) => ({
  items: [],
  selectedId: null,
  search: '',
  activeKeywords: [],
  keywords: {},

  addFiles: (files) => {
    const existing = new Set(get().items.map((i) => i.id));
    // Dedupe against what's already listed *and* within this batch, so
    // re-picking the same folder doesn't stack duplicate rows.
    const seen = new Set<string>();
    const added: LibraryItem[] = [];
    for (const file of files) {
      const id = libraryIdFor(file);
      if (existing.has(id) || seen.has(id)) continue;
      seen.add(id);
      added.push({
        id,
        name: file.name,
        size: file.size,
        file,
        status: 'pending',
        thumbnailUrl: null,
        metadata: null,
      });
    }
    if (added.length === 0) return [];
    set((s) => ({
      items: [...s.items, ...added].sort((a, b) => a.name.localeCompare(b.name)),
      // Dropping files into an empty browser should land you on something to
      // look at rather than an empty viewer.
      selectedId: s.selectedId ?? added[0].id,
    }));
    return added;
  },

  markProbed: (id, thumbnailUrl, metadata) =>
    set((s) => ({
      items: s.items.map((i) => {
        if (i.id !== id) return i;
        // A repeat probe would otherwise leak the previous blob URL.
        if (i.thumbnailUrl && i.thumbnailUrl !== thumbnailUrl) URL.revokeObjectURL(i.thumbnailUrl);
        return { ...i, status: 'ready' as const, thumbnailUrl, metadata };
      }),
    })),

  markFailed: (id, error) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, status: 'error' as const, error } : i)),
    })),

  select: (id) => set({ selectedId: id }),

  remove: (id) =>
    set((s) => {
      const target = s.items.find((i) => i.id === id);
      if (target?.thumbnailUrl) URL.revokeObjectURL(target.thumbnailUrl);
      const items = s.items.filter((i) => i.id !== id);
      // Removing the selected file should advance to a neighbour rather than
      // leaving the editor pointing at nothing.
      const selectedId = s.selectedId === id ? (items[0]?.id ?? null) : s.selectedId;
      return { items, selectedId };
    }),

  clear: () =>
    set((s) => {
      for (const i of s.items) if (i.thumbnailUrl) URL.revokeObjectURL(i.thumbnailUrl);
      return { items: [], selectedId: null, activeKeywords: [] };
    }),

  setSearch: (search) => set({ search }),

  toggleKeywordFilter: (keyword) =>
    set((s) => ({
      activeKeywords: s.activeKeywords.includes(keyword)
        ? s.activeKeywords.filter((k) => k !== keyword)
        : [...s.activeKeywords, keyword],
    })),

  clearKeywordFilters: () => set({ activeKeywords: [] }),

  hydrateKeywords: async () => {
    const keywords = await loadAllKeywords();
    set({ keywords });
  },

  addKeyword: (fileName, raw) => {
    const keyword = normalizeKeyword(raw);
    if (!keyword) return;
    const current = get().keywords[fileName] ?? [];
    if (current.includes(keyword)) return;
    const next = [...current, keyword].sort();
    set((s) => ({ keywords: { ...s.keywords, [fileName]: next } }));
    void saveKeywords(fileName, next);
  },

  removeKeyword: (fileName, keyword) => {
    const current = get().keywords[fileName] ?? [];
    if (!current.includes(keyword)) return;
    const next = current.filter((k) => k !== keyword);
    set((s) => {
      const keywords = { ...s.keywords };
      if (next.length === 0) delete keywords[fileName];
      else keywords[fileName] = next;
      return {
        keywords,
        // A filter chip for a keyword that no longer exists anywhere would
        // silently hide every file, so drop it once its last use is gone.
        activeKeywords: s.activeKeywords.filter(
          (k) => k !== keyword || Object.values(keywords).some((list) => list.includes(k)),
        ),
      };
    });
    void saveKeywords(fileName, next);
  },
}));

/** Every keyword in use, sorted — the filter bar's vocabulary. */
export function allKeywords(keywords: Record<string, string[]>): string[] {
  return [...new Set(Object.values(keywords).flat())].sort();
}

/** Applies the name search and the keyword filter (AND across keywords). */
export function filterItems(
  items: LibraryItem[],
  search: string,
  activeKeywords: string[],
  keywords: Record<string, string[]>,
): LibraryItem[] {
  const q = search.trim().toLowerCase();
  return items.filter((item) => {
    if (q && !item.name.toLowerCase().includes(q)) return false;
    if (activeKeywords.length === 0) return true;
    const tags = keywords[item.name] ?? [];
    return activeKeywords.every((k) => tags.includes(k));
  });
}
