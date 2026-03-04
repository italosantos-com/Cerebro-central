"use client";

import { useState, useRef, useEffect } from 'react';
import { X, Minimize2, Maximize2, Move } from 'lucide-react';
import HomePagePreview from './HomePagePreview';
import { Button } from '@/components/ui/button';

// Constants for preview scaling (50% reduction)
const PREVIEW_SCALE = 0.5;
const PREVIEW_SIZE_MULTIPLIER = 200; // Inverse of scale as percentage

interface AppearanceSettings {
    textColor?: string;
    numberColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    lineColor?: string;
    neonGlowColor?: string;
    containerColor?: string;
    backgroundColor?: string;
    iconColor?: string;
    fontFamily?: string;
    fontSizePx?: number;
}

interface DraggablePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    appearanceSettings?: AppearanceSettings;
    name?: string;
    coverPhotoUrl?: string;
    profilePhotoUrl?: string;
}

export default function DraggablePreviewModal({
    isOpen,
    onClose,
    appearanceSettings,
    name,
    coverPhotoUrl,
    profilePhotoUrl
}: DraggablePreviewModalProps) {
    const [position, setPosition] = useState({ x: 100, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setIsMinimized(false);
        }
    }, [isOpen]);

    // Close modal on Escape key press
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (modalRef.current && e.target === e.currentTarget) {
            const rect = modalRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
            setIsDragging(true);
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                // Calculate new position
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                
                // Get viewport dimensions
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const modalWidth = isMinimized ? 150 : 200;
                const modalHeight = modalRef.current?.offsetHeight || 0;
                
                // Constrain position to viewport
                const constrainedX = Math.max(0, Math.min(newX, viewportWidth - modalWidth));
                const constrainedY = Math.max(0, Math.min(newY, viewportHeight - modalHeight));
                
                setPosition({
                    x: constrainedX,
                    y: constrainedY
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, isMinimized]);

    if (!isOpen) return null;

    return (
        <>
            {/* Semi-transparent backdrop */}
            <div 
                className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Draggable modal */}
            <div
                ref={modalRef}
                className="fixed z-50 bg-background rounded-lg shadow-2xl border-2 border-primary/20 transition-all duration-200"
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: isMinimized ? '150px' : '200px',
                    maxHeight: '90vh',
                    cursor: isDragging ? 'grabbing' : 'default'
                }}
            >
                {/* Draggable header */}
                <div
                    className="flex items-center justify-between px-4 py-2 bg-primary/10 rounded-t-lg cursor-grab active:cursor-grabbing border-b select-none"
                    onMouseDown={handleMouseDown}
                >
                    <div className="flex items-center gap-2">
                        <Move className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">Preview da Página Inicial</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setIsMinimized(!isMinimized)}
                        >
                            {isMinimized ? (
                                <Maximize2 className="h-3 w-3" />
                            ) : (
                                <Minimize2 className="h-3 w-3" />
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={onClose}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                {!isMinimized && (
                    <div className="p-4 overflow-auto max-h-[calc(90vh-48px)]">
                        <div style={{ 
                            transform: `scale(${PREVIEW_SCALE})`, 
                            transformOrigin: 'top left', 
                            width: `${PREVIEW_SIZE_MULTIPLIER}%`, 
                            height: `${PREVIEW_SIZE_MULTIPLIER}%` 
                        }}>
                            <HomePagePreview
                                appearanceSettings={appearanceSettings}
                                name={name}
                                coverPhotoUrl={coverPhotoUrl}
                                profilePhotoUrl={profilePhotoUrl}
                            />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
