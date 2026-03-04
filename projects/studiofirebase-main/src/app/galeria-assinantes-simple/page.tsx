'use client'

import { useEffect, useState } from 'react'
import { useFaceIDAuth } from '@/contexts/face-id-auth-context'
import { useAuth } from '@/contexts/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function GaleriaAssinantesSimplePage() {
  const { isAuthenticated, userEmail: faceUserEmail, userType } = useFaceIDAuth()
  const { user: firebaseUser, userProfile } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Obter email do usuário de qualquer fonte
  const getUserEmail = () => {
    return firebaseUser?.email || 
           userProfile?.email || 
           faceUserEmail || 
           localStorage.getItem('userEmail') || 
           '';
  }

  // Verificar se o usuário está autenticado (Firebase OU Face ID local)
  const isUserAuthenticated = Boolean(
    firebaseUser || 
    isAuthenticated || 
    localStorage.getItem('isAuthenticated') === 'true'
  )

  const testSubscription = async () => {
    setIsLoading(true)
    const userEmail = getUserEmail()
    
    try {
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'checkSubscription',
          customerEmail: userEmail
        })
      })
      const data = await response.json()
      
      setDebugInfo({
        auth: {
          firebaseUser: !!firebaseUser,
          isAuthenticated,
          userProfile: !!userProfile,
          isUserAuthenticated,
          userEmail: userEmail,
          userType: userType
        },
        subscription: data,
        localStorage: {
          isAuthenticated: localStorage.getItem('isAuthenticated'),
          userEmail: localStorage.getItem('userEmail'),
          hasSubscription: localStorage.getItem('hasSubscription'),
          userType: localStorage.getItem('userType')
        },
        cookies: {
          isAuthenticated: document.cookie.includes('isAuthenticated=true'),
          hasSubscription: document.cookie.includes('hasSubscription=true')
        }
      })
    } catch (error) {
      setDebugInfo({
        error: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    testSubscription()
   
  }, []) // Executar apenas na montagem

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-2xl">🎭 Galeria de Assinantes - Versão Simples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Status de Autenticação */}
            <div className="bg-black/20 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">🔐 Status de Autenticação</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-300">Firebase User:</span>
                  <span className={`ml-2 ${firebaseUser ? 'text-green-400' : 'text-red-400'}`}>
                    {firebaseUser ? '✅ Conectado' : '❌ Não conectado'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-300">Face ID Auth:</span>
                  <span className={`ml-2 ${isAuthenticated ? 'text-green-400' : 'text-red-400'}`}>
                    {isAuthenticated ? '✅ Conectado' : '❌ Não conectado'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-300">User Type:</span>
                  <span className="ml-2 text-purple-300">{userType || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-300">Email:</span>
                  <span className="ml-2 text-purple-300">{getUserEmail() || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-300">Is User Authenticated:</span>
                  <span className={`ml-2 ${isUserAuthenticated ? 'text-green-400' : 'text-red-400'}`}>
                    {isUserAuthenticated ? '✅ Sim' : '❌ Não'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-300">Firebase Profile:</span>
                  <span className={`ml-2 ${userProfile ? 'text-green-400' : 'text-red-400'}`}>
                    {userProfile ? '✅ Carregado' : '❌ Não carregado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Status do Firebase Profile */}
            <div className="bg-black/20 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">🔥 Firebase Profile</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-300">Is Subscriber:</span>
                  <span className={`ml-2 ${userProfile?.isSubscriber ? 'text-green-400' : 'text-red-400'}`}>
                    {userProfile?.isSubscriber ? '✅ Sim' : '❌ Não'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-300">Email:</span>
                  <span className="ml-2 text-purple-300">{userProfile?.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-300">Display Name:</span>
                  <span className="ml-2 text-purple-300">{userProfile?.displayName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-300">UID:</span>
                  <span className="ml-2 text-purple-300">{userProfile?.uid || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Botão de Teste */}
            <div className="flex justify-center">
              <Button 
                onClick={testSubscription}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? '🔄 Testando...' : '🧪 Testar Assinatura'}
              </Button>
            </div>

            {/* Resultado do Teste */}
            {debugInfo && (
              <div className="bg-black/20 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">📊 Informações de Debug</h3>
                <pre className="mt-2 p-2 bg-black/30 rounded text-xs text-green-300 overflow-auto max-h-96">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}

            {/* Conteúdo da Galeria */}
            <div className="bg-black/20 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-4">🎭 Conteúdo Exclusivo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item} className="bg-white/10 rounded-lg p-4 border border-white/20">
                    <div className="w-full h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded mb-2"></div>
                    <h4 className="text-white font-medium">Conteúdo Exclusivo {item}</h4>
                    <p className="text-gray-300 text-sm">Descrição do conteúdo exclusivo para assinantes</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Links de Teste */}
            <div className="flex justify-center gap-4">
              <Button 
                onClick={() => window.location.href = '/galeria-assinantes'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                🎭 Ir para Galeria Real
              </Button>
              <Button 
                onClick={() => window.location.href = '/perfil'}
                className="bg-green-600 hover:bg-green-700"
              >
                👤 Ir para Perfil
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}

