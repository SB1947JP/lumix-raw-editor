import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** How the adjustment controls are drawn: classic horizontal sliders, or a
 *  Pioneer-DJ-mixer-style panel of rotary dials. Purely a presentation choice
 *  (it changes nothing about the edit params), so it lives in its own tiny
 *  store rather than in the persisted EditParams schema. */
export type ControlStyle = 'slider' | 'dial';

/** Which side of the window the editing panel sits on (desktop layout). */
export type PanelSide = 'left' | 'right';

/** Which tab of the editing panel is showing: the adjustment controls, or the
 *  file browser. They share one panel so the window holds a single column of
 *  chrome beside the photo rather than one on each side. */
export type SidebarTab = 'edit' | 'files';

interface UiModeStore {
  controlStyle: ControlStyle;
  setControlStyle: (style: ControlStyle) => void;
  toggleControlStyle: () => void;
  panelSide: PanelSide;
  setPanelSide: (side: PanelSide) => void;
  togglePanelSide: () => void;
  sidebarTab: SidebarTab;
  setSidebarTab: (tab: SidebarTab) => void;
}

export const useUiMode = create<UiModeStore>()(
  persist(
    (set) => ({
      controlStyle: 'slider',
      setControlStyle: (controlStyle) => set({ controlStyle }),
      toggleControlStyle: () => set((s) => ({ controlStyle: s.controlStyle === 'slider' ? 'dial' : 'slider' })),
      panelSide: 'right',
      setPanelSide: (panelSide) => set({ panelSide }),
      togglePanelSide: () => set((s) => ({ panelSide: s.panelSide === 'right' ? 'left' : 'right' })),
      sidebarTab: 'edit',
      setSidebarTab: (sidebarTab) => set({ sidebarTab }),
    }),
    {
      name: 'lumix-ui-mode',
      // Layout choices are worth remembering across reloads; the dial mixer
      // intentionally starts off each session.
      partialize: (s) => ({ panelSide: s.panelSide, sidebarTab: s.sidebarTab }),
    },
  ),
);
