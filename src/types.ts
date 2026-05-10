export interface Adjustments {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  clarity: number;
  saturation: number;
  vibrance: number;
  temperature: number;
  tint: number;
  sharpness: number;
  noise: number;
  transferStrength: number;
}

export type PresetName = 'None' | 'Vivid' | 'Matte' | 'Golden Hour' | 'Cool Breeze' | 'Film Noir' | 'Faded Film' | 'Moody' | 'Pastel' | 'Teal & Orange' | 'Rustic' | 'Clean & Bright' | 'Cyberpunk';

export const defaultAdjustments: Adjustments = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  clarity: 0,
  saturation: 0,
  vibrance: 0,
  temperature: 0,
  tint: 0,
  sharpness: 0,
  noise: 0,
  transferStrength: 100, // Default 100% when reference is loaded
};
