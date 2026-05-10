import React, { useEffect, useRef, useState, useCallback } from 'react';
import { processPixels } from '../lib/colorMath';
import { downscaleImage, loadImage } from '../lib/imageUtils';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'motion/react';
import { GripVertical } from 'lucide-react';

const PREVIEW_MAX_DIM = 512; // P1: Reduced resolution for better preview performance

export function SplitCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const { originalImageUrl, referenceImageUrl, adjustments, activePreset, setIsProcessing, splitPosition, setSplitPosition } = useAppStore();

  const [previewData, setPreviewData] = useState<ImageData | null>(null); // Original Image downscaled
  const [transferredData, setTransferredData] = useState<ImageData | null>(null); // 100% transferred cache

  // 1. Setup Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/colorWorker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (e) => {
      setIsProcessing(false);
      if (e.data.error) {
        console.error('Worker error:', e.data.error);
        return;
      }
      if (e.data.result) {
        setTransferredData(e.data.result);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [setIsProcessing]);

  // 2. Load Images and Prepare Data
  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!originalImageUrl) {
        setPreviewData(null);
        setTransferredData(null);
        return;
      }

      setIsProcessing(true);
      
      try {
        const origImg = await loadImage(originalImageUrl);
        if (!active) return;
        
        const downscaled = downscaleImage(origImg, PREVIEW_MAX_DIM);
        setPreviewData(downscaled);

        if (referenceImageUrl) {
          const refImg = await loadImage(referenceImageUrl);
          if (!active) return;
          const refDownscaled = downscaleImage(refImg, PREVIEW_MAX_DIM);
          
          if (workerRef.current) {
            workerRef.current.postMessage({
              original: downscaled,
              reference: refDownscaled
            });
          }
        } else {
          setTransferredData(null);
          setIsProcessing(false);
        }
      } catch (err) {
        console.error(err);
        setIsProcessing(false);
      }
    }

    loadData();

    return () => { active = false; };
  }, [originalImageUrl, referenceImageUrl, setIsProcessing]);

  // 3. Render Pipeline
  useEffect(() => {
    if (!previewData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // P2: Move canvas resizing out of RAF
    canvas.width = previewData.width;
    canvas.height = previewData.height;

    let rafId = requestAnimationFrame(() => {
      const outData = new ImageData(previewData.width, previewData.height);
      const isTransferActive = transferredData !== null;
      
      // P1: Removed redundant Uint8ClampedArray copies
      processPixels(
        previewData.data,
        transferredData ? transferredData.data : null,
        outData.data,
        adjustments,
        activePreset,
        isTransferActive
      );

      ctx.putImageData(outData, 0, 0);
    });

    return () => cancelAnimationFrame(rafId);
  }, [previewData, transferredData, adjustments, activePreset]);

  // Raw Canvas for comparison
  const rawCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!previewData) return;
    const canvas = rawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = previewData.width;
    canvas.height = previewData.height;
    ctx.putImageData(previewData, 0, 0);
  }, [previewData]);

  // P0: Touch and Mouse handlers for Splitter
  const handleMove = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSplitPosition((x / rect.width) * 100);
  }, [setSplitPosition]);

  const onStart = (e: React.MouseEvent | React.TouchEvent) => {
    const isTouch = 'touches' in e;
    const moveEvent = isTouch ? 'touchmove' : 'mousemove';
    const endEvent = isTouch ? 'touchend' : 'mouseup';

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      handleMove(clientX);
    };

    const onEnd = () => {
      window.removeEventListener(moveEvent, onMove as any);
      window.removeEventListener(endEvent, onEnd);
    };

    window.addEventListener(moveEvent, onMove as any);
    window.addEventListener(endEvent, onEnd);
  };

  if (!previewData) {
    return (
      <div className="flex bg-[#0A0A0A] rounded-2xl border border-white/5 items-center justify-center h-full w-full">
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="text-white/30 text-[13px] tracking-wide font-medium"
        >
          Waiting for image...
        </motion.p>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center overflow-hidden min-h-0 min-w-0" 
      ref={containerRef}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex shadow-2xl rounded-sm overflow-hidden ring-1 ring-white/10" 
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          aspectRatio: `${previewData.width}/${previewData.height}`
        }}
      >
        {/* Raw Original (Bottom) */}
        <canvas 
          ref={rawCanvasRef} 
          className="block"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />

        {/* Processed (Top, Clipped) */}
        <div 
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - splitPosition}% 0 0)` }}
        >
          <canvas 
            ref={canvasRef} 
            className="block w-full h-full"
          />
        </div>

        {/* Splitter Handle */}
        <div 
          className="absolute top-0 bottom-0 w-px bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.8)]"
          style={{ left: `calc(${splitPosition}%)` }}
          onMouseDown={onStart}
          onTouchStart={onStart}
        >
          <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110">
            <GripVertical size={14} className="opacity-80" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

