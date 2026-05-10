import { Adjustments, PresetName } from '../types';

// P3: Constants for magic numbers
const LUMINANCE_R = 0.299;
const LUMINANCE_G = 0.587;
const LUMINANCE_B = 0.114;
const MID_POINT = 127.5;
const EXPOSURE_SCALE = 2.55;

export const presetAdjustments: Record<PresetName, Partial<Adjustments>> = {
  'None': {},
  'Vivid': { contrast: 15, saturation: 30, vibrance: 20, clarity: 15 },
  'Matte': { contrast: -20, blacks: 20, shadows: 15 },
  'Golden Hour': { temperature: 30, tint: 5, saturation: 10, highlights: -10, shadows: 20 },
  'Cool Breeze': { temperature: -20, tint: -5, saturation: -10, whites: 10 },
  'Film Noir': { saturation: -100, contrast: 30, blacks: -15, clarity: 20 },
  'Faded Film': { contrast: -30, shadows: -20, blacks: 30, saturation: -20 },
  'Moody': { exposure: -15, contrast: 25, shadows: -15, blacks: -10, temperature: -10, saturation: -15 },
  'Pastel': { contrast: -15, shadows: 20, whites: -15, saturation: -10, vibrance: 10 },
  'Teal & Orange': { temperature: -10, tint: 10, vibrance: 30, saturation: 10 },
  'Rustic': { temperature: 15, tint: 10, saturation: -20, contrast: 15, blacks: 10 },
  'Clean & Bright': { exposure: 10, contrast: 5, highlights: -10, shadows: 15, vibrance: 15, clarity: 10 },
  'Cyberpunk': { temperature: -25, tint: 30, saturation: 40, highlights: 20, shadows: -20, contrast: 25 },
};

function applyContrast(c: number, factor: number) {
  return factor * (c - 128) + 128;
}

const clamp = (val: number) => Math.min(255, Math.max(0, val));

export function processPixels(
  originalData: Uint8ClampedArray,
  transferredData: Uint8ClampedArray | null,
  outData: Uint8ClampedArray,
  adjustments: Adjustments,
  preset: PresetName,
  transferMode: boolean
) {
  const len = originalData.length;
  
  const presetMods = presetAdjustments[preset];
  const exp = (adjustments.exposure + (presetMods.exposure || 0)) * EXPOSURE_SCALE; 
  const cont = adjustments.contrast + (presetMods.contrast || 0);
  const contrastFactor = (259 * (cont + 255)) / (255 * (259 - cont));

  const vSat = (adjustments.saturation + (presetMods.saturation || 0)) / 100;
  const vVib = (adjustments.vibrance + (presetMods.vibrance || 0)) / 100;
  const temp = (adjustments.temperature + (presetMods.temperature || 0));
  const tnt = (adjustments.tint + (presetMods.tint || 0));
  const hl = (adjustments.highlights + (presetMods.highlights || 0)) / 100;
  const sh = (adjustments.shadows + (presetMods.shadows || 0)) / 100;
  const wh = (adjustments.whites + (presetMods.whites || 0));
  const bl = (adjustments.blacks + (presetMods.blacks || 0));
  
  const blend = adjustments.transferStrength / 100;
  const wbOffset = wh - bl;

  for (let i = 0; i < len; i += 4) {
    let r = originalData[i];
    let g = originalData[i+1];
    let b = originalData[i+2];

    if (transferMode && transferredData) {
      r = r + (transferredData[i] - r) * blend;
      g = g + (transferredData[i+1] - g) * blend;
      b = b + (transferredData[i+2] - b) * blend;
    }

    // Exposure & WB
    r += exp + wbOffset; 
    g += exp + wbOffset; 
    b += exp + wbOffset;

    // Highlights / Shadows
    const lum = LUMINANCE_R * r + LUMINANCE_G * g + LUMINANCE_B * b;
    if (hl !== 0 && lum > MID_POINT) {
      const mult = 1 + (hl * (lum - MID_POINT) / MID_POINT);
      r *= mult; g *= mult; b *= mult;
    }
    if (sh !== 0 && lum <= MID_POINT) {
      const mult = 1 + (sh * (MID_POINT - lum) / MID_POINT);
      r *= mult; g *= mult; b *= mult;
    }

    // Contrast
    if (cont !== 0) {
      r = applyContrast(r, contrastFactor);
      g = applyContrast(g, contrastFactor);
      b = applyContrast(b, contrastFactor);
    }

    // Temperature & Tint
    r += temp;
    b -= temp;
    g += tnt;

    // Saturation and Vibrance
    if (vSat !== 0 || vVib !== 0) {
      const avg = (r + g + b) / 3;
      let amt = vSat;
      
      if (vVib !== 0) {
        const max = Math.max(r, g, b);
        const sat = max === 0 ? 0 : 1 - Math.min(r, g, b) / max;
        amt += vVib * (1 - sat);
      }
      
      r += (r - avg) * amt;
      g += (g - avg) * amt;
      b += (b - avg) * amt;
    }

    outData[i] = clamp(r);
    outData[i+1] = clamp(g);
    outData[i+2] = clamp(b);
    outData[i+3] = originalData[i+3];
  }
}

