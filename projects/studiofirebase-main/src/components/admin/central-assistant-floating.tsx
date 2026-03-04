"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CentralAssistantButton from '@/components/admin/central-assistant-button';
import CentralAssistantWidget from '@/components/admin/central-assistant-widget';

type Point = { x: number; y: number };

// Tailwind breakpoint constant for consistency
const MD_BREAKPOINT = 768; // Matches Tailwind's md: breakpoint

export default function CentralAssistantFloating() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<Point | null>(null);

  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
    captureEl: HTMLButtonElement | null;
  } | null>(null);
  const suppressNextClickRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingPosRef = useRef<Point | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const size = 64;
      // Responsive margin: smaller on mobile (matches md: breakpoint)
      const margin = window.innerWidth < MD_BREAKPOINT ? 16 : 24;
      // position representa o CENTRO do botão
      const x = window.innerWidth - margin - size / 2;
      const y = window.innerHeight - margin - size / 2;
      setPosition({ x, y });
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const flushRaf = () => {
      rafRef.current = null;
      if (!pendingPosRef.current) return;
      setPosition(pendingPosRef.current);
    };

    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (event.pointerId !== drag.pointerId) return;

      const size = 64;
      const margin = 16;

      const dx = event.clientX - drag.startClientX;
      const dy = event.clientY - drag.startClientY;
      if (!drag.moved && (Math.abs(dx) + Math.abs(dy) > 6)) {
        drag.moved = true;
      }

      // position é o centro do botão
      const x = event.clientX - drag.offsetX;
      const y = event.clientY - drag.offsetY;

      const maxX = window.innerWidth - margin - size / 2;
      const maxY = window.innerHeight - margin - size / 2;
      const minX = margin + size / 2;
      const minY = margin + size / 2;

      pendingPosRef.current = {
        x: Math.min(Math.max(x, minX), maxX),
        y: Math.min(Math.max(y, minY), maxY)
      };

      if (rafRef.current == null) {
        rafRef.current = window.requestAnimationFrame(flushRaf);
      }
    };

    const endDrag = () => {
      const drag = dragRef.current;
      if (!drag) return;

      if (drag.moved) {
        suppressNextClickRef.current = true;
        // libera no próximo tick (evita abrir ao soltar)
        window.setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 0);
      }

      try {
        if (drag.captureEl && drag.captureEl.hasPointerCapture(drag.pointerId)) {
          drag.captureEl.releasePointerCapture(drag.pointerId);
        }
      } catch {
        // ignore
      }

      dragRef.current = null;
    };

    const handleUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (event.pointerId !== drag.pointerId) return;
      endDrag();
    };

    const handleCancel = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (event.pointerId !== drag.pointerId) return;
      endDrag();
    };

    const handleBlur = () => {
      // se o usuário troca de aba/janela durante o drag
      endDrag();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      window.removeEventListener('blur', handleBlur);

      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [mounted]);

  if (!mounted || typeof document === 'undefined') return null;

  const toggle = () => setIsOpen((prev) => !prev);

  const handleClick = () => {
    // se acabou de arrastar, não abrir/fechar
    if (suppressNextClickRef.current) return;
    toggle();
  };

  const handleDragStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!position) return;

    // Evita scroll/seleção e melhora comportamento no mobile
    event.preventDefault();

    const pointerId = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(pointerId);
    } catch {
      // ignore
    }

    dragRef.current = {
      pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
      moved: false,
      captureEl: event.currentTarget,
    };
  };

  return createPortal(
    <>
      <CentralAssistantWidget isOpen={isOpen} onClose={toggle} />
      <CentralAssistantButton
        isOpen={isOpen}
        onClick={handleClick}
        position={position ?? undefined}
        onPointerDown={handleDragStart}
      />
    </>,
    document.body
  );
}