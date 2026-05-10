import { useEffect, useState } from 'react';
import { presetAdjustments, processPixels } from '../lib/colorMath';
import { downscaleImage, loadImage } from '../lib/imageUtils';
import { useAppStore } from '../store/useAppStore';
import { defaultAdjustments, PresetName } from '../types';
import { motion } from 'motion/react';

export function PresetsPanel() {
  const { activePreset, setPreset, originalImageUrl } = useAppStore();
  const presets = Object.keys(presetAdjustments) as PresetName[];
  
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function loadThumbnails() {
      if (!originalImageUrl) {
        setThumbnails({});
        return;
      }
      
      try {
        const img = await loadImage(originalImageUrl);
        if (!active) return;
        
        // Downscale to tiny 100px image first
        const thumbData = downscaleImage(img, 100);
        
        const canvas = document.createElement('canvas');
        canvas.width = thumbData.width;
        canvas.height = thumbData.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const urlMap: Record<string, string> = {};

        // Process each thumbnail
        presets.forEach((preset) => {
          const outData = new ImageData(thumbData.width, thumbData.height);
          processPixels(
            new Uint8ClampedArray(thumbData.data),
            null, // No transer cache for simple presets
            outData.data,
            defaultAdjustments,
            preset,
            false
          );
          ctx.putImageData(outData, 0, 0);
          urlMap[preset] = canvas.toDataURL('image/jpeg', 0.6);
        });

        if (active) {
          setThumbnails(urlMap);
        }
      } catch (e) {
        console.error(e);
      }
    }

    loadThumbnails();

    return () => { active = false; };
  }, [originalImageUrl]);

  return (
    <div className="mt-10">
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-4 ml-1">Presets</h3>
      <div className="grid grid-cols-3 gap-3">
        {presets.map((preset) => (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            key={preset}
            onClick={() => setPreset(preset)}
            className="flex flex-col items-center justify-start group"
          >
            <div 
              className={`w-14 h-14 rounded-full mb-3 bg-[#111] bg-cover bg-center transition-all duration-500 shadow-xl ${
                activePreset === preset 
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0A0A0A]' 
                  : 'ring-1 ring-white/10 group-hover:ring-white/30'
              }`} 
              style={{ backgroundImage: thumbnails[preset] ? `url(${thumbnails[preset]})` : 'none' }}
            />
            <span className={`text-[10px] text-center w-full leading-tight transition-colors duration-300 ${
              activePreset === preset ? 'text-white font-medium' : 'text-white/50 group-hover:text-white/80'
            }`}>
              {preset}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
