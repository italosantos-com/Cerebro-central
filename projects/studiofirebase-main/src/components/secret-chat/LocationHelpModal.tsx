"use client";

import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import React from 'react';

interface LocationHelpModalProps {
  show: boolean;
  onClose: () => void;
}

export function LocationHelpModal({ show, onClose }: LocationHelpModalProps) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Como resolver problemas de localização</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4 text-gray-300">
          <Section
            title="1. Verificar permissões do navegador"
            items={[
              'Clique no ícone de localização na barra de endereços',
              'Selecione "Permitir" para este site',
              'Recarregue a página e tente novamente'
            ]}
          />
          <Section
            title="2. Verificar configurações do dispositivo"
            items={[
              'Ative o GPS/Localização no seu dispositivo',
              'Verifique se o navegador tem permissão para localização',
              'Tente em outro navegador (Chrome, Firefox, Safari)'
            ]}
          />
          <Section
            title="3. Problemas comuns"
            items={[
              'Permissão negada: clique no ícone de localização e permita',
              'GPS desativado: ative a localização no dispositivo',
              'Tempo limite: aguarde mais tempo ou tente novamente',
              'Navegador antigo: use um navegador mais recente'
            ]}
          />
          <Section
            title="4. Alternativas"
            items={[
              'Use um dispositivo móvel (GPS mais preciso)',
              'Tente em modo de navegação privada',
              'Verifique se não há bloqueadores de localização'
            ]}
          />
        </div>
        <div className="flex justify-end mt-6">
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">Entendi</Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="font-medium text-white mb-2">{title}</h4>
      <ul className="text-sm space-y-1 ml-4 list-none">
        {items.map(item => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
