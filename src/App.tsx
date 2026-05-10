import { motion } from 'motion/react';
import React, { useState, useRef, useEffect } from 'react';
import { AdjustmentsPanel } from './components/AdjustmentsPanel';
import { PresetsPanel } from './components/PresetsPanel';
import { SplitCanvas } from './components/SplitCanvas';
import { UploadSection } from './components/UploadSection';
import { downscaleImage, imageDataToBlob, loadImage } from './lib/imageUtils';
import { processPixels } from './lib/colorMath';
import { useAppStore } from './store/useAppStore';
import { Download, Loader2, Maximize2, SlidersHorizontal, Image as ImageIcon, ShieldCheck } from 'lucide-react';

export default function App() {
  const { 
    setOriginalImage, 
    setReferenceImage, 
    originalImageUrl, 
    referenceImageUrl, 
    isProcessing,
    adjustments,
    activePreset
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'upload' | 'adjust'>('upload');
  const [isExporting, setIsExporting] = useState(false);
  
  // P2: Singleton worker for export to avoid repeated instantiation
  const exportWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => {
      exportWorkerRef.current?.terminate();
    };
  }, []);

  const handleExport = async () => {
    if (!originalImageUrl) return;
    setIsExporting(true);
    
    try {
      const origImg = await loadImage(originalImageUrl);
      // Hard cap to 4K to prevent OOM
      const fullResData = downscaleImage(origImg, 3840);

      let transferredFullRes: ImageData | null = null;

      if (referenceImageUrl) {
         const refImg = await loadImage(referenceImageUrl);
         const refData = downscaleImage(refImg, 1080);

         if (!exportWorkerRef.current) {
           exportWorkerRef.current = new Worker(new URL('./workers/colorWorker.ts', import.meta.url), { type: 'module' });
         }

         transferredFullRes = await new Promise<ImageData>((resolve, reject) => {
           const worker = exportWorkerRef.current!;
           worker.onmessage = (e) => {
             if (e.data.error) reject(e.data.error);
             else resolve(e.data.result);
           };
           worker.onerror = (e) => reject(e);
           worker.postMessage({ original: fullResData, reference: refData });
         });
      }

      const outData = new ImageData(fullResData.width, fullResData.height);
      
      // P1: Removed redundant Uint8ClampedArray copies
      processPixels(
        fullResData.data,
        transferredFullRes ? transferredFullRes.data : null,
        outData.data,
        adjustments,
        activePreset,
        transferredFullRes !== null
      );

      const blob = await imageDataToBlob(outData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      // P3: Sanitize filename
      const safeDate = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `palette-graft-${safeDate}.jpg`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      // P3: More professional error handling than alert
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] text-[#E0E0E0] font-sans overflow-hidden">
      {/* Header - P3: Semantic header */}
      <header className="flex-none h-14 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-md flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3 text-white font-medium text-[15px] tracking-wide">
          <Maximize2 size={16} className="text-white/40" />
          <h1>Palette Graft</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* P3: Privacy Notice */}
          <div className="hidden lg:flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/30 font-medium">
            <ShieldCheck size={12} />
            <span>Local Processing</span>
          </div>
          <button 
            disabled={!originalImageUrl || isProcessing || isExporting}
            onClick={handleExport}
            className="flex items-center gap-2 bg-white text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/30 text-xs font-medium px-5 py-2 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:shadow-none"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left Sidebar (Upload & Presets) - P3: Semantic aside */}
        <motion.aside 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full md:w-[320px] bg-[#0A0A0A] border-r border-white/5 p-6 overflow-y-auto hidden md:flex flex-col z-10"
        >
          <div className="space-y-6 flex-1">
            <UploadSection 
              label={originalImageUrl ? "Target Photo" : "Upload Target"} 
              onChange={setOriginalImage} 
            />
            {originalImageUrl && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <UploadSection 
                  label={referenceImageUrl ? "Reference Style" : "Upload Reference"} 
                  onChange={setReferenceImage} 
                />
              </motion.div>
            )}
            {originalImageUrl && <PresetsPanel />}
          </div>
        </motion.aside>

        {/* Center Canvas - P3: Semantic main */}
        <main className="flex-1 p-4 md:p-8 bg-[#050505] overflow-hidden relative flex items-center justify-center">
          {(isProcessing || isExporting) && (
             <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#0A0A0A]/90 text-white/80 px-5 py-2.5 rounded-full text-xs font-mono tracking-widest uppercase border border-white/10 backdrop-blur-xl shadow-2xl"
              >
                <Loader2 size={14} className="animate-spin" />
                <span>Processing</span>
              </motion.div>
          )}
          <SplitCanvas />
        </main>

        {/* Right Sidebar (Adjustments) */}
        <motion.aside 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="hidden md:block h-full z-10"
        >
          <AdjustmentsPanel />
        </motion.aside>

        {/* Mobile Tabs - P2: Improved height and P3: nav */}
        <nav className="md:hidden flex-none border-t border-white/5 bg-[#0A0A0A] z-20">
          <div className="flex border-b border-white/5">
            <button 
              className={`flex-1 flex justify-center items-center gap-2 py-4 text-[13px] tracking-wide transition-colors ${activeTab === 'upload' ? 'text-white border-b border-white' : 'text-white/40'}`}
              onClick={() => setActiveTab('upload')}
            >
               <ImageIcon size={14} /> Input
            </button>
            <button 
              className={`flex-1 flex justify-center items-center gap-2 py-4 text-[13px] tracking-wide transition-colors ${activeTab === 'adjust' ? 'text-white border-b border-white' : 'text-white/40'}`}
              onClick={() => setActiveTab('adjust')}
            >
               <SlidersHorizontal size={14} /> Adjust
            </button>
          </div>
          <div className="h-[40dvh] overflow-y-auto p-5">
            {activeTab === 'upload' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="space-y-4 mb-8">
                  <UploadSection label={originalImageUrl ? "Target Photo" : "Upload Target"} onChange={setOriginalImage} />
                  {originalImageUrl && <UploadSection label={referenceImageUrl ? "Reference Style" : "Upload Reference"} onChange={setReferenceImage} />}
                </div>
                {originalImageUrl && <PresetsPanel />}
              </motion.div>
            )}
            {activeTab === 'adjust' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="block [&>div]:w-full [&>div]:border-none [&>div]:h-auto [&>div]:block [&>div]:p-0 [&>div]:bg-transparent">
                <AdjustmentsPanel />
              </motion.div>
            )}
          </div>
        </nav>

      </div>
    </div>
  );
}

