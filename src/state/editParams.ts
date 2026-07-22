import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_EDIT_PARAMS, EditParams } from '../types';

interface EditParamsStore {
  params: EditParams;
  history: EditParams[];
  pendingSnapshot: EditParams | null;
  /** Values to render *as if* they were set, without actually setting them —
   *  used to preview a Look preset while the pointer hovers it. Kept separate
   *  from `params` on purpose: a preview must not touch the real values, the
   *  undo history, or the persisted state, and must vanish the moment the
   *  pointer leaves. Export always uses `params`, never this. */
  preview: Partial<EditParams> | null;
  setPreview: (preview: Partial<EditParams> | null) => void;
  /** Call once at the start of a gesture (pointer down, checkbox toggle) so the
   *  next `set()` records one undo step instead of one per intermediate value. */
  beginChange: () => void;
  set: <K extends keyof EditParams>(key: K, value: EditParams[K]) => void;
  undo: () => void;
  reset: () => void;
}

export const useEditParams = create<EditParamsStore>()(
  persist(
    (set, get) => ({
      params: { ...DEFAULT_EDIT_PARAMS },
      history: [],
      pendingSnapshot: null,
      preview: null,
      setPreview: (preview) => set({ preview }),
      beginChange: () => {
        if (!get().pendingSnapshot) {
          set((state) => ({ pendingSnapshot: state.params }));
        }
      },
      set: (key, value) =>
        set((state) => ({
          params: { ...state.params, [key]: value },
          preview: null,
          history: state.pendingSnapshot ? [...state.history, state.pendingSnapshot] : state.history,
          pendingSnapshot: null,
        })),
      undo: () =>
        set((state) => {
          if (state.history.length === 0) return state;
          const previous = state.history[state.history.length - 1];
          return { params: previous, history: state.history.slice(0, -1), pendingSnapshot: null, preview: null };
        }),
      reset: () => set({ params: { ...DEFAULT_EDIT_PARAMS }, history: [], pendingSnapshot: null, preview: null }),
    }),
    {
      // Undo history is a within-session convenience, not something a reload
      // should resurrect — only the current slider values survive a refresh.
      name: 'lumix-edit-params',
      partialize: (state) => ({ params: state.params }),
      // zustand's default merge is `{...currentState, ...persistedState}`,
      // which replaces `params` wholesale with whatever was persisted. That's
      // fine until EditParams grows a field (as it did for the tone curve,
      // colour grading, and AgX tone mapper, all added after this persistence
      // feature shipped) — a browser with an older persisted blob then
      // restores a `params` object missing those fields entirely, `undefined`
      // reaches components expecting e.g. an array of curve points, and with
      // no error boundary React unmounted the whole tree: a blank page with
      // no error shown. Defaulting each field against DEFAULT_EDIT_PARAMS
      // instead of replacing wholesale means an old persisted blob can only
      // ever be missing fields, never provide `undefined` for them.
      merge: (persisted, current) => ({
        ...current,
        params: { ...DEFAULT_EDIT_PARAMS, ...(persisted as { params?: Partial<EditParams> } | undefined)?.params },
      }),
    },
  ),
);

/** What the canvas should draw: the real params, with any hover preview laid
 *  over the top. Never use this for export — that must reflect what the user
 *  actually committed, not whatever they happen to be hovering. */
export function useRenderParams(): EditParams {
  const params = useEditParams((s) => s.params);
  const preview = useEditParams((s) => s.preview);
  return preview ? { ...params, ...preview } : params;
}
