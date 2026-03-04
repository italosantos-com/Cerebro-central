import React, { useState, useEffect } from 'react';
import { Sparkles, Menu, X, Settings, MessageSquare, Network, Wrench } from 'lucide-react';
import { DisclaimerModal } from './components/DisclaimerModal';
import { AdminPanel } from './components/AdminPanel';
import { ModelSelector } from './components/ModelSelector';
import { ToolsPanel } from './components/ToolsPanel';
import { CentralBrainChatWindow } from './components/CentralBrainChatWindow';
import { generateImage, generateVideo } from './services/aiService';
import { Message, ViewMode } from './types';
import { AVAILABLE_MODELS } from './constants';

const App: React.FC = () => {
  const [hasConsented, setHasConsented] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<ViewMode>('chat');
  const [currentModelId, setCurrentModelId] = useState<string>('gemini-2.5-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Olá. Eu sou o Cérebro Central. \n\nEstou aqui para satisfazer suas curiosidades mais profundas sobre fetiches, BDSM e prazer. Sem julgamentos, sem tabus. \n\nO que você deseja explorar hoje?',
      timestamp: new Date(),
      modelId: 'gemini-2.5-flash'
    },
  ]);

  const handleGenerateMedia = async (type: 'image' | 'video', prompt: string) => {
    setIsLoading(true);
    
    // Add user request message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: `Gerar ${type === 'image' ? 'imagem' : 'vídeo'}: ${prompt}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      let mediaUrl;
      if (type === 'image') {
        mediaUrl = await generateImage(prompt);
      } else {
        mediaUrl = await generateVideo(prompt);
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `Aqui está o seu ${type === 'image' ? 'visual' : 'vídeo'} exclusivo.`,
        timestamp: new Date(),
        modelId: currentModelId,
        attachment: {
          type: type,
          url: mediaUrl
        }
      };
      setMessages((prev) => [...prev, botMessage]);

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `Falha ao gerar ${type}. Tente novamente com um prompt diferente.`,
        timestamp: new Date(),
        modelId: currentModelId
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getCurrentModelName = () => {
    return AVAILABLE_MODELS.find(m => m.id === currentModelId)?.name || 'Cérebro Central';
  };

  if (!hasConsented) {
    return <DisclaimerModal onAccept={() => setHasConsented(true)} />;
  }

  return (
    <div className="flex h-screen bg-velvet-black text-zinc-200 font-sans">
      {/* Sidebar (Mobile Drawer / Desktop Sidebar) */}
      <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-velvet-dark border-r border-white/5 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:flex-shrink-0 flex flex-col`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-velvet-red w-6 h-6" />
            <h1 className="text-lg font-bold tracking-wider text-white">CÉREBRO CENTRAL</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-zinc-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Navigation */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">Navegação</div>
            
            <button 
              onClick={() => { setCurrentView('chat'); setIsSidebarOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${currentView === 'chat' ? 'bg-velvet-red/20 text-velvet-red' : 'hover:bg-white/5 text-zinc-400'}`}
            >
              <MessageSquare size={18} />
              Chat
            </button>

            <button 
              onClick={() => { setCurrentView('admin'); setIsSidebarOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${currentView === 'admin' ? 'bg-velvet-red/20 text-velvet-red' : 'hover:bg-white/5 text-zinc-400'}`}
            >
              <Settings size={18} />
              Serviços / Admin
            </button>
          </div>

          {/* Model Selector */}
          <div className="border-t border-white/5 pt-4">
            <ModelSelector 
              currentModelId={currentModelId} 
              onSelectModel={(id) => {
                setCurrentModelId(id);
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }} 
            />
          </div>

          {currentView === 'chat' && (
            <div className="border-t border-white/5 pt-4">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">Tópicos Sugeridos</div>
              {['Introdução ao BDSM', 'Roleplay Seguro', 'Fetiches de Pés', 'Dominatrix 101', 'Vocabulário Explícito'].map((topic) => (
                <button 
                  key={topic}
                  onClick={() => {
                    setMessages((prev) => [...prev, {
                      id: Date.now().toString(),
                      role: 'user',
                      text: `Me fale sobre ${topic}`,
                      timestamp: new Date(),
                    }]);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 hover:text-zinc-200 text-zinc-400 transition-colors text-sm"
                >
                  {topic}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-600">
            <Network size={12} />
            <span>Intercomunicação Ativa</span>
          </div>
          <div className="text-[10px] text-zinc-600 text-center mt-1">
            Cérebro Central v1.3
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative bg-gradient-to-b from-velvet-black to-[#0f0508]">
        
        {/* Header Mobile */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-velvet-black/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <Sparkles className="text-velvet-red w-5 h-5" />
            <span className="font-bold text-white">CÉREBRO</span>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="text-zinc-300">
            <Menu size={24} />
          </button>
        </div>

        {/* View Switcher */}
        {currentView === 'admin' ? (
          <AdminPanel />
        ) : (
          <div className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden">
            <div className="max-w-3xl w-full mx-auto h-full flex flex-col">
              <CentralBrainChatWindow
                messages={messages}
                onMessagesChange={setMessages}
                isLoading={isLoading}
                onLoadingChange={setIsLoading}
                currentModelId={currentModelId}
                isSearchEnabled={isSearchEnabled}
              />
            </div>

            {/* Tools Panel Overlay */}
            <ToolsPanel 
              isOpen={isToolsOpen} 
              onClose={() => setIsToolsOpen(false)}
              isSearchEnabled={isSearchEnabled}
              onToggleSearch={() => setIsSearchEnabled(!isSearchEnabled)}
              onGenerateImage={(prompt) => handleGenerateMedia('image', prompt)}
              onGenerateVideo={(prompt) => handleGenerateMedia('video', prompt)}
              isGenerating={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
