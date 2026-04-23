import { Fingerprint, Clock } from 'lucide-react';
import React from 'react';

export function AppIcon({ size = 64, className = "" }: { size?: number, className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <Clock size={size * 0.9} className="text-primary absolute" />
      <Fingerprint size={size * 0.6} className="text-white/80 absolute" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }} />
    </div>
  );
}
