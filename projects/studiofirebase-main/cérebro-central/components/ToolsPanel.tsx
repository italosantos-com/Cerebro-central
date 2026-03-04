import React, { useState } from 'react';
import { Search, Image as ImageIcon, Video, X, Loader2 } from 'lucide-react';

interface ToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isSearchEnabled: boolean;
  onToggleSearch: () => void;
  onGenerateImage: (prompt: string) => void;
  onGenerateVideo: (prompt: string) => void;
  isGenerating: boolean;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({
  isOpen,
  onClose,
  isSearchEnabled,
  onToggleSearch,
  onGenerateImage,
  onGenerateVideo,
  isGenerating
}) => {
  const [mediaPrompt, setMediaPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (!mediaPrompt.trim()) return;
    if (activeTab === 'image') {
      onGenerateImage(mediaPrompt);
    } else {
      onGenerateVideo(mediaPrompt);
    }
    setMediaPrompt('');
    onClose();
  };

  return (
    <div className="absolute bottom-20 left-4 right-4 md:left-auto md:right-8 md:w-80 bg-velvet-card border border-velvet-red/30 rounded-xl shadow-2xl shadow-black/50 z-30 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-velvet-black/50">
        <span className="text-xs font-bold text-white uppercase tracking-wider">Ferramentas Google</span>
        <button onClick={onClose} className="text-zinc-400 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Search Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isSearchEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500'}`}>
              <Search size={18} />
            </div>
            <div>
              <div className="text-sm font-medium text-white">Google Search</div>
              <div className="text-[10px] text-zinc-500">Conectar à web em tempo real</div>
            </div>
          </div>
          <button 
            onClick={onToggleSearch}
            className={`w-10 h-5 rounded-full relative transition-colors ${isSearchEnabled ? 'bg-velvet-red' : 'bg-zinc-700'}`}
          >
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${isSearchEnabled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        <div className="h-px bg-white/5" />

        {/* Media Generation */}
        <div>
          <div className="flex gap-2 mb-3">
            <button 
              onClick={() => setActiveTab('image')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${activeTab === 'image' ? 'bg-white/10 text-white' : 'bg-transparent text-zinc-500 hover:bg-white/5'}`}
            >
              <ImageIcon size={14} /> Imagen 3
            </button>
            <button 
              onClick={() => setActiveTab('video')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${activeTab === 'video' ? 'bg-white/10 text-white' : 'bg-transparent text-zinc-500 hover:bg-white/5'}`}
            >
              <Video size={14} /> Veo Video
            </button>
          </div>

          <textarea
            value={mediaPrompt}
            onChange={(e) => setMediaPrompt(e.target.value)}
            placeholder={activeTab === 'image' ? "Descreva a imagem..." : "Descreva o vídeo..."}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:border-velvet-red focus:outline-none resize-none h-20 mb-3"
          />

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !mediaPrompt.trim()}
            className="w-full py-2 bg-velvet-red hover:bg-velvet-red-hover text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : (activeTab === 'image' ? <ImageIcon size={14} /> : <Video size={14} />)}
            {isGenerating ? 'Gerando...' : 'Gerar Mídia'}
          </button>
        </div>
      </div>
    </div>
  );
};
