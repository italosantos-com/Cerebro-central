import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface DisclaimerModalProps {
  onAccept: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4">
      <div className="bg-velvet-card border border-velvet-red/30 rounded-xl max-w-md w-full p-8 shadow-2xl shadow-velvet-red/10 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-velvet-red/10 rounded-full">
            <ShieldAlert className="w-12 h-12 text-velvet-red" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-4 tracking-wide uppercase">
          Conteúdo Adulto (+18)
        </h2>
        
        <p className="text-velvet-muted mb-6 leading-relaxed">
          Este chat contém linguagem explícita, temas de BDSM e conteúdo sexual sem censura. 
          Ao entrar, você confirma que tem mais de 18 anos e consente em visualizar este tipo de material.
        </p>

        <div className="space-y-3">
          <button
            onClick={onAccept}
            className="w-full py-3 px-6 bg-velvet-red hover:bg-velvet-red-hover text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-velvet-red/50"
          >
            Eu tenho +18 anos e Aceito
          </button>
          
          <a 
            href="https://www.google.com"
            className="block w-full py-3 px-6 bg-transparent border border-velvet-muted/30 text-velvet-muted hover:text-white hover:border-white/50 font-medium rounded-lg transition-colors"
          >
            Sair
          </a>
        </div>
        
        <p className="mt-6 text-xs text-zinc-600">
          O Cérebro Central preza pelo consentimento e segurança. Práticas ilegais não são toleradas.
        </p>
      </div>
    </div>
  );
};
