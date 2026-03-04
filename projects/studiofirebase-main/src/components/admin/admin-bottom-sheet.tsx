"use client";

import { motion, PanInfo, useAnimation } from "framer-motion";
import { ReactNode, useEffect } from "react";
import { Menu } from "lucide-react";

interface AdminBottomSheetProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const SHEET_HEIGHT = "85vh";
const PEEK_HEIGHT = 56; // Height of the visible tip when closed
const DRAG_THRESHOLD = 100; // Distance to drag before closing/opening
const DRAG_HANDLE_HEIGHT = "3.5rem"; // Height of drag handle and peek area combined

export default function AdminBottomSheet({
  children,
  isOpen,
  onClose,
  onOpen
}: AdminBottomSheetProps) {
  const controls = useAnimation();

  useEffect(() => {
    if (isOpen) {
      controls.start({ y: 0 });
    } else {
      controls.start({ y: `calc(100% - ${PEEK_HEIGHT}px)` });
    }
  }, [isOpen, controls]);

  const handleDragEnd = (panInfo: PanInfo) => {
    const shouldClose = panInfo.velocity.y > 500 || (panInfo.offset.y > DRAG_THRESHOLD && isOpen);
    const shouldOpen = panInfo.velocity.y < -500 || (panInfo.offset.y < -DRAG_THRESHOLD && !isOpen);

    if (shouldClose && isOpen) {
      onClose();
    } else if (shouldOpen && !isOpen) {
      onOpen();
    } else {
      // Snap back to current state
      controls.start({ y: isOpen ? 0 : `calc(100% - ${PEEK_HEIGHT}px)` });
    }
  };

  const handlePeekClick = () => {
    if (!isOpen) {
      onOpen();
    }
  };

  return (
    <>
      {/* Backdrop - only visible when open */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Bottom Sheet */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, panInfo) => handleDragEnd(panInfo)}
        animate={controls}
        initial={{ y: `calc(100% - ${PEEK_HEIGHT}px)` }}
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 500,
        }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border shadow-2xl rounded-t-3xl"
        style={{
          height: SHEET_HEIGHT,
          touchAction: "none",
        }}
      >
        {/* Drag Handle and Peek Area */}
        <div
          className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onClick={handlePeekClick}
        >
          <div className="w-12 h-1.5 bg-sidebar-accent/40 rounded-full mb-2" />
          {!isOpen && (
            <div className="flex items-center gap-2 text-sidebar-foreground/70 text-sm font-medium">
              <Menu className="h-4 w-4" />
              <span>Menu Admin</span>
            </div>
          )}
        </div>

        {/* Sheet Content */}
        <div className="overflow-hidden" style={{ height: `calc(100% - ${DRAG_HANDLE_HEIGHT})` }}>
          {children}
        </div>
      </motion.div>
    </>
  );
}
