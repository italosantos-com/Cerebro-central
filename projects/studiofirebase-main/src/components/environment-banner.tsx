'use client'

import { useEnvironment } from '@/hooks/use-environment'
import { Info, Globe } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { isFeatureEnabled } from '@/utils/build-config'

export default function EnvironmentBanner() {
  const environment = useEnvironment()

  // Só mostrar se a feature estiver ativa E estivermos em localhost
  if (!isFeatureEnabled('environmentBanner') || !environment.isLocalhost) {
    return null
  }

  return (
    <Alert className="mb-4 border-blue-200 bg-blue-50/50">
      <Info className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="text-sm">
          <strong>Desenvolvimento:</strong> Embeds tentam carregar normalmente. Se falharem, mostram link direto.
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-600 opacity-75">
          <Globe className="h-3 w-3" />
          {environment.hostname}
        </div>
      </AlertDescription>
    </Alert>
  )
}
