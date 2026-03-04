import React from 'react';
import { Sparkles, Bot, Zap, Brain, Check } from 'lucide-react';
import { AVAILABLE_MODELS } from '../constants';
import { AIModel } from '../types';

interface ModelSelectorProps {
  currentModelId: string;
  onSelectModel: (modelId: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ currentModelId, onSelectModel }) => {
  
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Bot': return <Bot size={18} />;
      case 'Zap': return <Zap size={18} />;
      case 'Brain': return <Brain size={18} />;
      default: return <Sparkles size={18} />;
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">
        Núcleo de Inteligência
      </h3>
      <div className="space-y-1">
        {AVAILABLE_MODELS.map((model) => {
          const isActive = currentModelId === model.id;
          return (
            <button
              key={model.id}
              onClick={() => onSelectModel(model.id)}
              className={`w-full text-left px-3 py-3 rounded-lg flex items-start gap-3 transition-all border ${
                isActive 
                  ? 'bg-velvet-red/10 border-velvet-red/50 text-white shadow-lg shadow-velvet-red/5' 
                  : 'bg-transparent border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              <div className={`mt-0.5 ${isActive ? 'text-velvet-red' : 'text-zinc-500'}`}>
                {getIcon(model.icon)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${isActive ? 'text-white' : ''}`}>
                    {model.name}
                  </span>
                  {isActive && <Check size={14} className="text-velvet-red" />}
                </div>
                <p className="text-[10px] leading-tight mt-1 opacity-70">
                  {model.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
