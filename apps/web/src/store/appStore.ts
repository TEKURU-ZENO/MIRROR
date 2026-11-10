// Zustand store — global application state
// Separates UI state from the three data planes (which live in Dexie/Firestore)

import { create } from 'zustand';

interface AppState {
  // Active incident context
  activeIncidentId: string | null;
  setActiveIncidentId: (id: string | null) => void;

  // Active inspection being worked on
  activeInspectionId: string | null;
  setActiveInspectionId: (id: string | null) => void;

  // Offline override for testing
  forceOffline: boolean;
  setForceOffline: (v: boolean) => void;

  // Spike validation results (Day 1)
  spikeResults: Record<string, 'pass' | 'fail' | 'warn' | null>;
  setSpikeResult: (id: string, result: 'pass' | 'fail' | 'warn') => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeIncidentId: null,
  setActiveIncidentId: (id) => set({ activeIncidentId: id }),

  activeInspectionId: null,
  setActiveInspectionId: (id) => set({ activeInspectionId: id }),

  forceOffline: false,
  setForceOffline: (v) => set({ forceOffline: v }),

  spikeResults: {},
  setSpikeResult: (id, result) =>
    set((s) => ({ spikeResults: { ...s.spikeResults, [id]: result } })),
}));
