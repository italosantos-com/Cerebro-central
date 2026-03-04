import React, { useState } from 'react';
import { 
  Search, Trash2, UserX, Gift, KeyRound, CreditCard, 
  RefreshCw, Database, Calendar, CheckCircle, AlertCircle,
  Activity, Palette
} from 'lucide-react';
import { Microservices } from '../services/microservices';
import { UserData } from '../types';
import { ColorPanel } from './ColorPanel';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'subscription' | 'system' | 'schedule' | 'colors'>('users');
  const [loading, setLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  
  // State for forms
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  
  const [scheduleData, setScheduleData] = useState({ date: '', time: '', type: 'private-chat' });

  const showNotification = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleAction = async (actionName: string, actionFn: () => Promise<any>) => {
    setLoading(actionName);
    try {
      const res = await actionFn();
      showNotification('success', res.message);
    } catch (error) {
      showNotification('error', 'Falha ao executar operação.');
    } finally {
      setLoading(null);
    }
  };

  // Service Wrappers
  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading('search');
    const res = await Microservices.searchUserData(searchQuery);
    setSearchResults(res.data || []);
    setLoading(null);
  };

  const handleDeleteAuth = (uid: string) => handleAction('deleteAuth', () => Microservices.deleteAuthUser(uid));
  const handleDeleteData = (uid: string) => handleAction('deleteData', () => Microservices.deleteUserData(uid));
  const handleResetPass = (email: string) => handleAction('resetPass', () => Microservices.sendPasswordReset(email));
  const handleGrantDays = (uid: string) => handleAction('grantDays', () => Microservices.grantFreeDays(uid, 7));
  const handleActivateSub = (uid: string) => handleAction('activateSub', () => Microservices.activateSubscription(uid, 'premium'));
  const handleClearExternal = () => handleAction('clearExt', () => Microservices.clearDataExternal('payment-gateway'));
  const handleSchedule = () => handleAction('schedule', () => 
    Microservices.scheduleService('current-user', `${scheduleData.date} ${scheduleData.time}`, scheduleData.type)
  );

  return (
    <div className="h-full flex flex-col bg-velvet-black text-zinc-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-velvet-dark/50 backdrop-blur flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wider flex items-center gap-2">
            <Activity className="text-velvet-red" />
            PAINEL DE CONTROLE
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Gerenciamento de Microsserviços</p>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`absolute top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-xl border flex items-center gap-3 animate-pulse-slow ${
          notification.type === 'success' 
            ? 'bg-green-900/90 border-green-500/50 text-green-100' 
            : 'bg-red-900/90 border-red-500/50 text-red-100'
        }`}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{notification.msg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-velvet-black">
        {[
          { id: 'users', label: 'Usuários', icon: Search },
          { id: 'subscription', label: 'Assinaturas', icon: CreditCard },
          { id: 'system', label: 'Sistema', icon: Database },
          { id: 'schedule', label: 'Agendamento', icon: Calendar },
          { id: 'colors', label: 'Cores & Imagens', icon: Palette },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'text-velvet-red border-b-2 border-velvet-red bg-white/5' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }`}
          >
            <tab.icon size={16} />
            <span className="hidden md:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-velvet-black to-[#1a0508]">
        <div className="max-w-5xl mx-auto">
          
          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Search Section */}
              <div className="bg-velvet-card border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Search size={18} className="text-velvet-red" />
                  Buscar Dados de Usuário
                </h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ID ou Email do usuário..."
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:border-velvet-red focus:outline-none"
                  />
                  <button 
                    onClick={handleSearch}
                    disabled={loading === 'search'}
                    className="bg-velvet-red hover:bg-velvet-red-hover text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loading === 'search' ? '...' : 'Buscar'}
                  </button>
                </div>

                {/* Results */}
                {searchResults.length > 0 && (
                  <div className="mt-6 space-y-2">
                    {searchResults.map(user => (
                      <div key={user.id} className="bg-zinc-900/50 p-4 rounded-lg border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                          <div className="font-bold text-white">{user.email}</div>
                          <div className="text-xs text-zinc-500">ID: {user.id} | Status: <span className={user.status === 'active' ? 'text-green-500' : 'text-red-500'}>{user.status}</span></div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleDeleteAuth(user.id)}
                            disabled={!!loading}
                            className="p-2 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded border border-red-900/50 text-xs flex items-center gap-1"
                            title="delete-auth-user-service"
                          >
                            <UserX size={14} /> Auth
                          </button>
                          <button 
                            onClick={() => handleDeleteData(user.id)}
                            disabled={!!loading}
                            className="p-2 bg-orange-900/30 text-orange-400 hover:bg-orange-900/50 rounded border border-orange-900/50 text-xs flex items-center gap-1"
                            title="delete-user-data-service"
                          >
                            <Trash2 size={14} /> Dados
                          </button>
                          <button 
                            onClick={() => handleResetPass(user.email)}
                            disabled={!!loading}
                            className="p-2 bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 rounded border border-blue-900/50 text-xs flex items-center gap-1"
                            title="send-password-reset-service"
                          >
                            <KeyRound size={14} /> Reset
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUBSCRIPTION TAB */}
          {activeTab === 'subscription' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-velvet-card border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Gift size={18} className="text-velvet-red" />
                  Conceder Dias Grátis
                </h3>
                <p className="text-sm text-zinc-500 mb-4">Adiciona 7 dias de acesso premium ao usuário.</p>
                <input 
                  type="text" 
                  placeholder="ID do Usuário"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 mb-4 focus:border-velvet-red focus:outline-none"
                  onChange={(e) => setSelectedUser(e.target.value)}
                />
                <button 
                  onClick={() => handleGrantDays(selectedUser || 'demo-user')}
                  disabled={!!loading}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg border border-white/10 transition-colors"
                >
                  {loading === 'grantDays' ? 'Processando...' : 'Executar grant-free-days-service'}
                </button>
              </div>

              <div className="bg-velvet-card border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CreditCard size={18} className="text-velvet-red" />
                  Ativar Assinatura
                </h3>
                <p className="text-sm text-zinc-500 mb-4">Força a ativação do plano Premium.</p>
                <input 
                  type="text" 
                  placeholder="ID do Usuário"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 mb-4 focus:border-velvet-red focus:outline-none"
                  onChange={(e) => setSelectedUser(e.target.value)}
                />
                <button 
                  onClick={() => handleActivateSub(selectedUser || 'demo-user')}
                  disabled={!!loading}
                  className="w-full bg-velvet-red hover:bg-velvet-red-hover text-white py-2 rounded-lg transition-colors"
                >
                  {loading === 'activateSub' ? 'Processando...' : 'Executar activate-subscription-service'}
                </button>
              </div>
            </div>
          )}

          {/* SYSTEM TAB */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="bg-velvet-card border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Database size={18} className="text-velvet-red" />
                  Manutenção de Dados Externos
                </h3>
                <div className="bg-zinc-900/50 p-4 rounded-lg border border-red-900/20 mb-6">
                  <p className="text-sm text-zinc-400">
                    Esta ação limpará caches e dados temporários de serviços integrados. Use com cautela.
                  </p>
                </div>
                <button 
                  onClick={handleClearExternal}
                  disabled={!!loading}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-lg transition-colors"
                >
                  <RefreshCw size={18} className={loading === 'clearExt' ? 'animate-spin' : ''} />
                  Executar clear-data-external-service
                </button>
              </div>
            </div>
          )}

          {/* SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <div className="bg-velvet-card border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Calendar size={18} className="text-velvet-red" />
                Novo Agendamento
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Data</label>
                  <input 
                    type="date" 
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:border-velvet-red focus:outline-none text-white"
                    onChange={(e) => setScheduleData({...scheduleData, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Horário</label>
                  <input 
                    type="time" 
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:border-velvet-red focus:outline-none text-white"
                    onChange={(e) => setScheduleData({...scheduleData, time: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-zinc-500 mb-1">Tipo de Serviço</label>
                  <select 
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:border-velvet-red focus:outline-none text-white"
                    onChange={(e) => setScheduleData({...scheduleData, type: e.target.value})}
                    value={scheduleData.type}
                  >
                    <option value="private-chat">Chat Privado VIP</option>
                    <option value="video-call">Videochamada Exclusiva</option>
                    <option value="consultancy">Consultoria BDSM</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleSchedule}
                disabled={!!loading || !scheduleData.date || !scheduleData.time}
                className="w-full bg-velvet-red hover:bg-velvet-red-hover text-white py-3 rounded-lg font-bold tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'schedule' ? 'Agendando...' : 'CONFIRMAR AGENDAMENTO'}
              </button>
            </div>
          )}

          {/* COLORS & IMAGES TAB */}
          {activeTab === 'colors' && (
            <ColorPanel />
          )}

        </div>
      </div>
    </div>
  );
};
