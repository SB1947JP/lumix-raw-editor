import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_EDIT_PARAMS, EditParams } from '../types';

interface EditParamsStore {
  params: EditParams;
  history: EditParams[];
  pendingSnapshot: EditParams | null;
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
      beginChange: () => {
        if (!get().pendingSnapshot) {
          set((state) => ({ pendingSnapshot: state.params }));
        }
      },
      set: (key, value) =>
        set((state) => ({
          params: { ...state.params, [key]: value },
          history: state.pendingSnapshot ? [...state.history, state.pendingSnapshot] : state.history,
          pendingSnapshot: null,
        })),
      undo: () =>
        set((state) => {
          if (state.history.length === 0) return state;
          const previous = state.history[state.history.length - 1];
          return { params: previous, history: state.history.slice(0, -1), pendingSnapshot: null };
        }),
      reset: () => set({ params: { ...DEFAULT_EDIT_PARAMS }, history: [], pendingSnapshot: null }),
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
