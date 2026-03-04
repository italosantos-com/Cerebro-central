
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert } from 'lucide-react';

interface AdultWarningDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
}

export default function AdultWarningDialog({ isOpen, onConfirm }: AdultWarningDialogProps) {
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="bg-card border-gray-400 shadow-lg">
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-16 w-16 text-white" />
          </div>
          <AlertDialogTitle className="text-center text-2xl font-bold text-foreground">
            Aviso de Conteúdo Adulto
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-muted-foreground pt-2">
            CONTEÚDO ADULTO PODE CONTER CENAS DE SEXO EXTREMO E VIOLÊNCIA.
            <br />
            Pressione continuar apenas se você tiver 18 anos ou mais.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={onConfirm}
            className="w-full bg-white text-black hover:bg-gray-200 h-12 text-base shadow-lg"
          >
            Tenho 18+ | Continuar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
