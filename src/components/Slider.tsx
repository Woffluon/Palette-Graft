import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  onDoubleClick?: () => void;
}

export function Slider({ label, value, min = -100, max = 100, onChange, onDoubleClick }: SliderProps) {
  // calculate percentage for track background
  const percentage = ((value - min) / (max - min)) * 100;
  const id = React.useId();
  
  return (
    <div className="mb-6 group">
      <div className="flex justify-between items-center mb-3 cursor-pointer" onDoubleClick={onDoubleClick} title="Double click to reset">
        <label htmlFor={id} className="text-[11px] font-medium tracking-wide text-white/70 group-hover:text-white/90 transition-colors uppercase">{label}</label>
        <span className="text-[11px] text-white/60 font-mono w-10 text-right group-hover:text-white/90 transition-colors">
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <div className="relative w-full h-[3px] rounded-full bg-white/10 group-hover:bg-white/20 transition-colors flex items-center">
        <div 
          className="absolute h-full bg-white rounded-full transition-all duration-100 ease-out" 
          style={{ width: `${percentage}%` }} 
        />
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          aria-label={label}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-10 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-full"
        />
        {/* Custom thumb */}
        <div 
          className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.7)] transform -translate-x-1/2 pointer-events-none transition-transform group-hover:scale-125"
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

