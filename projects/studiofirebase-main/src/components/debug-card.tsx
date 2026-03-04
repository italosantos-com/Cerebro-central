'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isFeatureEnabled } from '@/utils/build-config'

interface DebugCardProps {
  data: any
  title: string
}

export default function DebugCard({ data, title }: DebugCardProps) {
  // Só mostrar se a feature estiver ativa
  if (!isFeatureEnabled('debugCards')) {
    return null
  }

  return (
    <Card className="mb-4 border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-yellow-800">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-xs text-yellow-700 overflow-auto max-h-32">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  )
}
