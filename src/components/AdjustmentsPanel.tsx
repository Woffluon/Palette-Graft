import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Adjustments } from '../types';
import { Slider } from './Slider';

export function AdjustmentsPanel() {
  const { adjustments, updateAdjustment, resetAdjustments, referenceImageUrl } = useAppStore();

  const handleUpdate = (key: keyof Adjustments, val: number) => {
    updateAdjustment(key, val);
  };

  const GroupTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-semibold mb-6 mt-10 first:mt-2 ml-1">{children}</h3>
  );

  return (
    <div className="w-full md:w-[320px] bg-[#0A0A0A] md:border-l border-white/5 p-6 overflow-y-auto h-full">
      <div className="flex justify-between items-center mb-10 pl-1">
        <h2 className="text-[15px] font-medium text-white tracking-wide">Adjustments</h2>
        <button 
          onClick={resetAdjustments}
          className="text-[11px] uppercase tracking-wider font-medium text-white/60 hover:text-white transition-colors p-3 -m-3"
        >
          Reset
        </button>
      </div>

      {referenceImageUrl && (
        <>
          <GroupTitle>Color Transfer</GroupTitle>
          <Slider label="Strength" min={0} max={100} value={adjustments.transferStrength} onChange={(v) => handleUpdate('transferStrength', v)} onDoubleClick={() => handleUpdate('transferStrength', 100)} />
          <div className="h-px bg-white/5 my-8" />
        </>
      )}

      <GroupTitle>Light</GroupTitle>
      <Slider label="Exposure" value={adjustments.exposure} onChange={(v) => handleUpdate('exposure', v)} onDoubleClick={() => handleUpdate('exposure', 0)} />
      <Slider label="Contrast" value={adjustments.contrast} onChange={(v) => handleUpdate('contrast', v)} onDoubleClick={() => handleUpdate('contrast', 0)} />
      <Slider label="Highlights" value={adjustments.highlights} onChange={(v) => handleUpdate('highlights', v)} onDoubleClick={() => handleUpdate('highlights', 0)} />
      <Slider label="Shadows" value={adjustments.shadows} onChange={(v) => handleUpdate('shadows', v)} onDoubleClick={() => handleUpdate('shadows', 0)} />
      <Slider label="Whites" value={adjustments.whites} onChange={(v) => handleUpdate('whites', v)} onDoubleClick={() => handleUpdate('whites', 0)} />
      <Slider label="Blacks" value={adjustments.blacks} onChange={(v) => handleUpdate('blacks', v)} onDoubleClick={() => handleUpdate('blacks', 0)} />

      <GroupTitle>Color</GroupTitle>
      <Slider label="Temperature" value={adjustments.temperature} onChange={(v) => handleUpdate('temperature', v)} onDoubleClick={() => handleUpdate('temperature', 0)} />
      <Slider label="Tint" value={adjustments.tint} onChange={(v) => handleUpdate('tint', v)} onDoubleClick={() => handleUpdate('tint', 0)} />
      <Slider label="Vibrance" value={adjustments.vibrance} onChange={(v) => handleUpdate('vibrance', v)} onDoubleClick={() => handleUpdate('vibrance', 0)} />
      <Slider label="Saturation" value={adjustments.saturation} onChange={(v) => handleUpdate('saturation', v)} onDoubleClick={() => handleUpdate('saturation', 0)} />

    </div>
  );
}

