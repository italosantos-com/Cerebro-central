'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Lightbulb, ExternalLink, RefreshCw, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface LocalhostPhotoBrowserProps {
  url: string
  title?: string
  onClose?: () => void
  platform: 'google-photos' | 'icloud'
}

/**
 * Componente especial para lidar com Google Photos e iCloud em LOCALHOST
 * 
 * Como Google Photos e iCloud bloqueiam localhost por padrão:
 * - Mostra instruções para deploy em produção
 * - Oferece alternativas para teste local
 * - Fornece URL de teste para Vercel/Firebase Hosting
 */
export default function LocalhostPhotoBrowser({
  url,
  title = 'Mídia',
  onClose,
  platform = 'google-photos'
}: LocalhostPhotoBrowserProps) {
  const [isLocalhost, setIsLocalhost] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  useEffect(() => {
    // Detectar se está em localhost
    const host = typeof window !== 'undefined' ? window.location.hostname : ''
    setIsLocalhost(host === 'localhost' || host === '127.0.0.1' || host === '[::1]')

    // Detectar se token está expirado
    if (url.includes('expired') || url.includes('exp=') || url.includes('signature')) {
      // Verificar data de expiração se houver parâmetro 'exp'
      const expMatch = url.match(/exp=(\d+)/)
      if (expMatch) {
        const expTime = parseInt(expMatch[1]) * 1000 // converter para millisegundos
        if (expTime < Date.now()) {
          setIsExpired(true)
        }
      }
    }
  }, [url])

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const getProductionUrl = (): string => {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.href.replace('localhost:3000', 'italosantos.com')
      : 'https://italosantos.com'
    return baseUrl
  }

  if (isLocalhost && !isExpired) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3 text-white">
            <Lightbulb className="w-5 h-5" />
            <div>
              <p className="font-semibold">
                🔒 {platform === 'google-photos' ? 'Google Photos' : 'iCloud'} - Localhost
              </p>
              <p className="text-xs text-orange-100">
                Bloqueado para segurança - Veja a solução abaixo
              </p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-orange-700"
            >
              ✕
            </Button>
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Explicação */}
          <Alert className="border-amber-300 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-900 mt-2">
              <p className="font-semibold mb-2">Por que não funciona em localhost?</p>
              <p>
                {platform === 'google-photos' 
                  ? 'Google Photos bloqueia iframes em localhost e conexões HTTP por razões de segurança.'
                  : 'iCloud bloqueia iframes em localhost e implementa X-Frame-Options: DENY por padrão.'
                }
              </p>
            </AlertDescription>
          </Alert>

          {/* Soluções */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">✅ Soluções para Teste</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Solução 1: Produção */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-green-700">1️⃣ Testar em Produção (Recomendado)</h4>
                <p className="text-sm text-gray-600">
                  Deploy para Vercel, Firebase Hosting ou seu domínio para testar Google Photos/iCloud
                </p>
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <p className="text-xs font-mono text-gray-700 break-all">
                    {getProductionUrl()}
                  </p>
                </div>
                <Button 
                  className="w-full"
                  onClick={() => window.open(getProductionUrl(), '_blank')}
                >
                  Abrir em Produção ↗
                </Button>
              </div>

              {/* Solução 2: Tunnel */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-blue-700">2️⃣ Usar Tunnel Local (ngrok/Cloudflare)</h4>
                <p className="text-sm text-gray-600">
                  Expor seu localhost para internet recebendo HTTPS válido
                </p>
                <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm space-y-2">
                  <p>
                    <strong>Com ngrok:</strong>
                    <br/>
                    <code className="bg-gray-800 text-green-400 p-2 rounded block mt-1 text-xs overflow-x-auto">
                      ngrok http 3000
                    </code>
                  </p>
                  <p>
                    <strong>Com Cloudflare Tunnel:</strong>
                    <br/>
                    <code className="bg-gray-800 text-green-400 p-2 rounded block mt-1 text-xs overflow-x-auto">
                      cloudflare tunnel --url http://localhost:3000
                    </code>
                  </p>
                </div>
              </div>

              {/* Solução 3: Modo Incógnito */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-purple-700">3️⃣ Teste com iframe Sandbox</h4>
                <p className="text-sm text-gray-600">
                  Abrir a URL diretamente em uma aba para validar que o link é válido
                </p>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(url, '_blank')}
                >
                  Abrir Link Direto ↗
                </Button>
              </div>

              {/* Solução 4: Mock */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-cyan-700">4️⃣ Usar Mock para Desenvolvimento</h4>
                <p className="text-sm text-gray-600">
                  Substitua Google Photos/iCloud por YouTube/Vimeo para testes em localhost
                </p>
                <code className="bg-gray-800 text-green-400 p-3 rounded block text-xs overflow-x-auto">
                  {`<SmartVideoPlayer\n  url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"\n  title="Teste Mock"\n/>`}
                </code>
              </div>
            </CardContent>
          </Card>

          {/* URL Compartilhamento */}
          <Card className="border-blue-300 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-base text-blue-900">📋 URL para Teste</CardTitle>
              <CardDescription className="text-blue-800">Copie a URL para fazer teste em produção</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="bg-white p-3 rounded border border-blue-200 break-all font-mono text-xs text-gray-700">
                {url}
              </div>
              <Button
                onClick={handleCopyUrl}
                className="w-full"
                variant={copiedUrl ? 'default' : 'outline'}
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar URL
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Nota */}
          <Alert className="border-green-300 bg-green-50">
            <Lightbulb className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-900 mt-2">
              <p className="font-semibold mb-1">💡 Dica: Como melhorar?</p>
              <p>
                Na produção, o componente {platform === 'google-photos' ? 'SmartVideoPlayer' : 'PhotoMediaBrowser'} funcionará perfeitamente 
                pois HTTPS + domínio válido são permitidos.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3 text-white">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">⏰ Token Expirado</p>
              <p className="text-xs text-red-100">
                O link de compartilhamento expirou
              </p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-red-700"
            >
              ✕
            </Button>
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col items-center justify-center">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-center">❌ Link Expirado</CardTitle>
              <CardDescription className="text-center">
                {platform === 'google-photos'
                  ? 'Este álbum compartilhado do Google Photos expirou'
                  : 'Este álbum compartilhado do iCloud expirou'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-red-300 bg-red-50">
                <AlertDescription className="text-sm">
                  <p className="font-semibold mb-2">O que fazer?</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Gere um novo link de compartilhamento</li>
                    <li>Certifique-se de que o álbum ainda existe</li>
                    <li>Verifique as permissões de compartilhamento</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <p className="text-sm font-semibold mb-2">📝 Como gerar novo link:</p>
                <ol className="text-xs space-y-1 list-decimal list-inside">
                  {platform === 'google-photos' ? (
                    <>
                      <li>Abra Google Fotos (photos.google.com)</li>
                      <li>Acesse o álbum</li>
                      <li>Clique em "Compartilhar" (canto superior direito)</li>
                      <li>Clique em "Criar link" e copie</li>
                    </>
                  ) : (
                    <>
                      <li>Abra iCloud.com</li>
                      <li>Vá em Fotos → Compartilhado</li>
                      <li>Selecione o álbum</li>
                      <li>Clique em "Pessoas" → "Copiar link"</li>
                    </>
                  )}
                </ol>
              </div>

              <Button
                onClick={onClose}
                className="w-full"
              >
                Fechar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}
