"use client";

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CentralAssistantButtonProps {
  onClick: () => void;
  isOpen: boolean;
  position?: { x: number; y: number };
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

export default function CentralAssistantButton({
  onClick,
  isOpen,
  position,
  onPointerDown
}: CentralAssistantButtonProps) {
  const [iconSrc, setIconSrc] = useState('/cerebro-central.svg');

  if (isOpen) return null;

  return (
    <div
      className={cn(
        "fixed z-40 flex flex-col items-center gap-2",
        position ? "-translate-x-1/2 -translate-y-1/2" : ""
      )}
      style={position ? { left: position.x, top: position.y } : { right: 24, bottom: 24 }}
    >
      <button
        onClick={onClick}
        onPointerDown={onPointerDown}
        aria-label="Abrir Cérebro Central"
        className={cn(
          "relative h-16 w-16 transition-all duration-300 order-2 group rounded-full border border-gray-400 bg-transparent hover:scale-105 shadow-neon-white",
          "touch-none select-none cursor-grab active:cursor-grabbing"
        )}
      >
        <div className="relative h-full w-full rounded-full overflow-hidden">
          <Image
            src={iconSrc}
            alt="Cérebro Central"
            fill
            sizes="64px"
            className="rounded-full object-cover scale-125"
            style={{ backgroundColor: 'transparent' }}
            onError={() => setIconSrc('/cerebro-central.png')}
          />
        </div>
      </button>
    </div>
  );
}