import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Send, 
  Terminal, 
  Cpu, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  AlertCircle,
  Code,
  History
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  messages?: Message[];
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentChat, setCurrentChat] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState("mistral");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (currentId) {
      fetchChat(currentId);
    } else {
      setCurrentChat(null);
    }
  }, [currentId]);

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data);
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    }
  };

  const fetchChat = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      setCurrentChat(data);
    } catch (err) {
      console.error("Failed to fetch chat", err);
    }
  };

  const createNewChat = async () => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Chat ${new Date().toLocaleTimeString()}` })
      });
      const data = await res.json();
      setConversations([data, ...conversations]);
      setCurrentId(data.id);
      setError(null);
    } catch (err) {
      console.error("Failed to create chat", err);
    }
  };

  const deleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations(conversations.filter(c => c.id !== id));
      if (currentId === id) setCurrentId(null);
    } catch (err) {
      console.error("Failed to delete chat", err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentId || isLoading) return;

    const userMessage = input;
    setInput("");
    setIsLoading(true);
    setError(null);

    // Optimistic update
    if (currentChat) {
      setCurrentChat({
        ...currentChat,
        messages: [...(currentChat.messages || []), { id: Date.now(), role: "user", content: userMessage, created_at: new Date().toISOString() }]
      });
    }

    try {
      const res = await fetch(`/api/chat/${currentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage, model })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ollama error");
      }

      const data = await res.json();
      fetchChat(currentId);
    } catch (err: any) {
      setError(err.message);
      // Rollback or show error in chat
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 300 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="border-r border-zinc-800 bg-zinc-900/50 flex flex-col relative overflow-hidden"
      >
        <div className="p-4 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-2 font-semibold text-emerald-500">
            <Cpu size={20} />
            <span>MiniCopilot</span>
          </div>
          <button 
            onClick={createNewChat}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
            title="Nova Conversa"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setCurrentId(conv.id)}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                currentId === conv.id ? "bg-zinc-800 text-white" : "hover:bg-zinc-800/50 text-zinc-400"
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={16} className="shrink-0" />
                <span className="truncate text-sm font-medium">{conv.title}</span>
              </div>
              <button 
                onClick={(e) => deleteChat(e, conv.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
            <Settings size={12} />
            <span>CONFIGURAÇÃO</span>
          </div>
          <select 
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="mistral">Mistral 7B</option>
            <option value="deepseek-coder:6.7b">DeepSeek Coder 6.7B</option>
            <option value="phi3:mini">Phi-3 Mini</option>
          </select>
          <div className="mt-4 text-[10px] text-zinc-600 uppercase tracking-widest text-center">
            Offline Mode Active
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400"
            >
              {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold truncate max-w-[200px] sm:max-w-md">
                {currentChat?.title || "Selecione uma conversa"}
              </h1>
              <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">
                {model} • 2048 Context
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase">Ollama Local</span>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 scrollbar-hide">
          {!currentId ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 shadow-2xl">
                <Terminal className="text-emerald-500" size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Bem-vindo ao MiniCopilot</h2>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Sua estação de desenvolvimento offline. Inicie uma nova conversa para começar a codar com IA local.
                </p>
              </div>
              <button 
                onClick={createNewChat}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-900/20"
              >
                <Plus size={20} />
                Nova Conversa
              </button>
              
              <div className="grid grid-cols-2 gap-4 w-full mt-8">
                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-left">
                  <Code size={16} className="text-emerald-500 mb-2" />
                  <div className="text-xs font-bold mb-1 uppercase tracking-wider">Código</div>
                  <div className="text-[11px] text-zinc-500">Gere funções e refatore scripts localmente.</div>
                </div>
                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-left">
                  <History size={16} className="text-emerald-500 mb-2" />
                  <div className="text-xs font-bold mb-1 uppercase tracking-wider">Memória</div>
                  <div className="text-[11px] text-zinc-500">Conversas persistentes salvas em SQLite.</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {currentChat?.messages?.map((msg) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 ${
                    msg.role === "user" 
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/10" 
                      : "bg-zinc-900 border border-zinc-800 text-zinc-200"
                  }`}>
                    <div className="flex items-center gap-2 mb-2 opacity-50 text-[10px] font-bold uppercase tracking-widest">
                      {msg.role === "user" ? "Você" : "MiniCopilot"}
                    </div>
                    <div className="markdown-body text-sm sm:text-base">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
                    <Loader2 className="animate-spin text-emerald-500" size={18} />
                    <span className="text-sm text-zinc-400">Pensando...</span>
                  </div>
                </motion.div>
              )}

              {error && (
                <div className="flex justify-center">
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        {currentId && (
          <div className="p-4 sm:p-6 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800">
            <div className="max-w-4xl mx-auto relative">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Pergunte algo ou peça um código..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-4 pr-14 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none scrollbar-hide"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                  input.trim() && !isLoading 
                    ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20" 
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                }`}
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              </button>
            </div>
            <div className="mt-3 text-center text-[10px] text-zinc-600 uppercase tracking-widest">
              Pressione Enter para enviar • Shift + Enter para nova linha
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
