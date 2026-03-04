'use client';

import DatabaseHealthCheck from '@/components/database-health-check';

export default function DatabaseHealthPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Verificação de Integridade do Banco</h1>
        <p className="text-muted-foreground mt-2">
          Análise completa da saúde e consistência do banco de dados Firebase
        </p>
      </div>
      
      <DatabaseHealthCheck />
      
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-semibold mb-2">📋 O que é verificado:</h3>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• <strong>Coleção &apos;users&apos;:</strong> Usuários com assinaturas válidas</li>
          <li>• <strong>Coleção &apos;subscribers&apos;:</strong> Assinaturas ativas com datas corretas</li>
          <li>• <strong>Coleção &apos;photos&apos;:</strong> Conteúdo exclusivo de fotos</li>
          <li>• <strong>Coleção &apos;videos&apos;:</strong> Conteúdo exclusivo de vídeos</li>
          <li>• <strong>Consistência:</strong> Sincronização entre usuários e assinaturas</li>
          <li>• <strong>Integridade:</strong> Datas de expiração e status válidos</li>
        </ul>
      </div>
    </div>
  );
}
