import { create } from 'zustand';
import { Adjustments, defaultAdjustments, PresetName } from '../types';

interface AppState {
  originalImageUrl: string | null;
  referenceImageUrl: string | null;
  
  adjustments: Adjustments;
  activePreset: PresetName;
  
  isProcessing: boolean;
  splitPosition: number; // 0 to 100
  
  setOriginalImage: (url: string | null) => void;
  setReferenceImage: (url: string | null) => void;
  updateAdjustment: (key: keyof Adjustments, value: number) => void;
  setPreset: (preset: PresetName) => void;
  setIsProcessing: (status: boolean) => void;
  setSplitPosition: (pos: number) => void;
  resetAdjustments: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  originalImageUrl: null,
  referenceImageUrl: null,
  
  adjustments: { ...defaultAdjustments },
  activePreset: 'None',
  
  isProcessing: false,
  splitPosition: 50,
  
  setOriginalImage: (url) => {
    const current = get().originalImageUrl;
    if (current) URL.revokeObjectURL(current);
    set({ originalImageUrl: url });
  },
  
  setReferenceImage: (url) => {
    const current = get().referenceImageUrl;
    if (current) URL.revokeObjectURL(current);
    set({ referenceImageUrl: url });
  },
  
  updateAdjustment: (key, value) => {
    set((state) => ({
      adjustments: {
        ...state.adjustments,
        [key]: value,
      },
    }));
  },
  
  setPreset: (preset) => set({ activePreset: preset }),
  setIsProcessing: (status) => set({ isProcessing: status }),
  setSplitPosition: (pos) => set({ splitPosition: pos }),
  
  resetAdjustments: () => set({ adjustments: { ...defaultAdjustments }, activePreset: 'None' }),
}));
