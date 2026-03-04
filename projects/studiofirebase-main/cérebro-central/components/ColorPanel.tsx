import React, { useState } from 'react';
import { Palette, Image, Upload, Link2, CheckCircle, AlertCircle } from 'lucide-react';
import { Microservices } from '../services/microservices';

interface ColorPanelProps {}

export const ColorPanel: React.FC<ColorPanelProps> = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  
  // Color states
  const [selectedColorType, setSelectedColorType] = useState('velvet-red');
  const [colorValue, setColorValue] = useState('#e11d48');
  
  // Image states
  const [imageSource, setImageSource] = useState('');
  const [imageSourceType, setImageSourceType] = useState<'url' | 'file'>('url');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');

  const showNotification = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleChangeColor = async () => {
    setLoading('changeColor');
    try {
      const res = await Microservices.changePageColor(selectedColorType, colorValue);
      showNotification(res.success ? 'success' : 'error', res.message);
    } catch (error) {
      showNotification('error', 'Falha ao alterar cor.');
    } finally {
      setLoading(null);
    }
  };

  const handleUploadImage = async () => {
    if (!imageSource && imageSourceType === 'url') {
      showNotification('error', 'Por favor, forneça uma URL de imagem.');
      return;
    }
    
    setLoading('uploadImage');
    try {
      const res = await Microservices.uploadImage(imageSource, imageSourceType);
      if (res.success && res.data?.imageUrl) {
        setUploadedImageUrl(res.data.imageUrl);
        showNotification('success', res.message);
      } else {
        showNotification('error', res.message);
      }
    } catch (error) {
      showNotification('error', 'Falha ao carregar imagem.');
    } finally {
      setLoading(null);
    }
  };

  const handleChangeBackground = async () => {
    if (!uploadedImageUrl) {
      showNotification('error', 'Por favor, carregue uma imagem primeiro.');
      return;
    }
    
    setLoading('changeBg');
    try {
      const res = await Microservices.changeBackgroundImage(uploadedImageUrl);
      showNotification(res.success ? 'success' : 'error', res.message);
    } catch (error) {
      showNotification('error', 'Falha ao alterar fundo.');
    } finally {
      setLoading(null);
    }
  };

  const predefinedColors = [
    { name: 'Vermelho Veludo', value: '#e11d48', type: 'velvet-red' },
    { name: 'Roxo Profundo', value: '#7c3aed', type: 'velvet-red' },
    { name: 'Azul Noturno', value: '#1e3a8a', type: 'velvet-red' },
    { name: 'Verde Esmeralda', value: '#059669', type: 'velvet-red' },
    { name: 'Laranja Fogo', value: '#ea580c', type: 'velvet-red' },
    { name: 'Rosa Quente', value: '#ec4899', type: 'velvet-red' },
  ];

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className={`absolute top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-xl border flex items-center gap-3 ${
          notification.type === 'success' 
            ? 'bg-green-900/90 border-green-500/50 text-green-100' 
            : 'bg-red-900/90 border-red-500/50 text-red-100'
        }`}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{notification.msg}</span>
        </div>
      )}

      {/* Color Management Section */}
      <div className="bg-velvet-card border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Palette size={18} className="text-velvet-red" />
          Painel de Cores
        </h3>

        <div className="space-y-4">
          {/* Color Type Selector */}
          <div>
            <label className="block text-xs text-zinc-500 mb-2">Tipo de Cor</label>
            <select
              value={selectedColorType}
              onChange={(e) => setSelectedColorType(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:border-velvet-red focus:outline-none text-white"
            >
              <option value="velvet-red">Cor Principal (velvet-red)</option>
              <option value="velvet-black">Fundo Principal (velvet-black)</option>
              <option value="velvet-dark">Fundo Escuro (velvet-dark)</option>
              <option value="velvet-card">Cor dos Cards (velvet-card)</option>
              <option value="velvet-red-hover">Hover Principal (velvet-red-hover)</option>
            </select>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs text-zinc-500 mb-2">Selecionar Cor</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={colorValue}
                onChange={(e) => setColorValue(e.target.value)}
                className="h-12 w-20 bg-zinc-900 border border-zinc-700 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={colorValue}
                onChange={(e) => setColorValue(e.target.value)}
                placeholder="#e11d48"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:border-velvet-red focus:outline-none text-white"
              />
            </div>
          </div>

          {/* Predefined Colors */}
          <div>
            <label className="block text-xs text-zinc-500 mb-2">Cores Predefinidas</label>
            <div className="grid grid-cols-3 gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => {
                    setColorValue(color.value);
                    setSelectedColorType(color.type);
                  }}
                  className="flex items-center gap-2 p-2 bg-zinc-900/50 hover:bg-zinc-800 rounded-lg border border-zinc-700 transition-colors"
                >
                  <div 
                    className="w-6 h-6 rounded border border-white/20"
                    style={{ backgroundColor: color.value }}
                  />
                  <span className="text-xs text-zinc-300">{color.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Apply Button */}
          <button
            onClick={handleChangeColor}
            disabled={!!loading}
            className="w-full bg-velvet-red hover:bg-velvet-red-hover text-white py-3 rounded-lg font-bold tracking-wide transition-colors disabled:opacity-50"
          >
            {loading === 'changeColor' ? 'Aplicando...' : 'APLICAR COR'}
          </button>
        </div>
      </div>

      {/* Image Management Section */}
      <div className="bg-velvet-card border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Image size={18} className="text-velvet-red" />
          Gerenciamento de Imagens
        </h3>

        <div className="space-y-4">
          {/* Source Type Toggle */}
          <div className="flex gap-2 p-1 bg-zinc-900 rounded-lg">
            <button
              onClick={() => setImageSourceType('url')}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                imageSourceType === 'url' 
                  ? 'bg-velvet-red text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Link2 size={16} />
              URL
            </button>
            <button
              onClick={() => setImageSourceType('file')}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                imageSourceType === 'file' 
                  ? 'bg-velvet-red text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Upload size={16} />
              Upload
            </button>
          </div>

          {/* Image Source Input */}
          {imageSourceType === 'url' ? (
            <div>
              <label className="block text-xs text-zinc-500 mb-2">URL da Imagem</label>
              <input
                type="text"
                value={imageSource}
                onChange={(e) => setImageSource(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:border-velvet-red focus:outline-none text-white"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-zinc-500 mb-2">Arquivo de Imagem</label>
              <div className="bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-velvet-red transition-colors cursor-pointer">
                <Upload size={32} className="mx-auto mb-2 text-zinc-500" />
                <p className="text-sm text-zinc-400">Clique para fazer upload</p>
                <p className="text-xs text-zinc-600 mt-1">(Funcionalidade simulada)</p>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUploadImage}
            disabled={!!loading}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg border border-white/10 transition-colors disabled:opacity-50"
          >
            {loading === 'uploadImage' ? 'Carregando...' : 'CARREGAR IMAGEM'}
          </button>

          {/* Preview and Apply Background */}
          {uploadedImageUrl && (
            <div className="mt-4 space-y-4">
              <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-700">
                <p className="text-xs text-zinc-500 mb-2">Imagem Carregada:</p>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-16 rounded bg-zinc-800 border border-zinc-700 overflow-hidden">
                    <img 
                      src={uploadedImageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23333" width="64" height="64"/%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-zinc-400 break-all">{uploadedImageUrl}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleChangeBackground}
                disabled={!!loading}
                className="w-full bg-velvet-red hover:bg-velvet-red-hover text-white py-3 rounded-lg font-bold tracking-wide transition-colors disabled:opacity-50"
              >
                {loading === 'changeBg' ? 'Aplicando...' : 'APLICAR COMO FUNDO'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4">
        <p className="text-sm text-blue-300">
          <strong>Comandos:</strong> Use este painel para alterar dinamicamente as cores da página e gerenciar imagens de fundo através de URLs ou uploads.
        </p>
      </div>
    </div>
  );
};
