import { UploadCloud } from 'lucide-react';
import React, { useRef } from 'react';
import { motion } from 'motion/react';

interface UploadSectionProps {
  label: string;
  onChange: (url: string) => void;
  icon?: React.ReactNode;
}

export function UploadSection({ label, onChange, icon }: UploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onChange(url);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      className="relative flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl p-8 cursor-pointer transition-all duration-500 text-center group overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      <input 
        type="file" 
        accept="image/png, image/jpeg, image/webp" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        aria-label={`Upload ${label}`}
      />
      
      <div className="mb-4 text-white/30 group-hover:text-white/80 transition-colors duration-500 transform group-hover:-translate-y-1">
        {icon || <UploadCloud strokeWidth={1} size={36} />}
      </div>
      <h3 className="text-[13px] font-medium tracking-wide text-white/80 group-hover:text-white transition-colors duration-300">{label}</h3>
      <p className="text-[11px] text-white/40 mt-1.5 tracking-wider uppercase font-mono">Drag & Drop or Click</p>
    </motion.div>
  );
}
