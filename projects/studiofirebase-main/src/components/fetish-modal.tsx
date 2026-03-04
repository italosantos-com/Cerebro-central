
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Fetish } from '@/lib/fetish-data';

interface FetishModalProps {
  fetish: Fetish;
  isOpen: boolean;
  onClose: () => void;
}

export default function FetishModal({ fetish, isOpen, onClose }: FetishModalProps) {
  if (!fetish) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 bg-card border-gray-400 shadow-lg">
        <ScrollArea className="max-h-[90vh]">
          <div className="relative h-64 w-full overflow-hidden">
            <div className="absolute inset-0 bg-gray-900" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
          </div>
          <div className="p-6 pt-0 -mt-8 relative z-10">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold mb-2 text-white">{fetish.title}</DialogTitle>
              <DialogDescription asChild>
                <p className="text-base text-muted-foreground whitespace-pre-wrap">
                  {fetish.description}
                </p>
              </DialogDescription>
            </DialogHeader>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
