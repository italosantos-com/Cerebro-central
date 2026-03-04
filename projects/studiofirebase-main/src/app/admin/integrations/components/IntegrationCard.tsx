
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings } from "lucide-react";

interface IntegrationCardProps {
  platform: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isConnected: boolean;
  isLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync?: () => void;
  syncing?: boolean;
  onSettings?: () => void;
  permissions?: string[];
  extraAction?: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
  };
}

export default function IntegrationCard({
  platform,
  title,
  description,
  icon,
  isConnected,
  isLoading,
  onConnect,
  onDisconnect,
  onSync,
  syncing,
  onSettings,
  permissions,
  extraAction
}: IntegrationCardProps) {
  const brandColors: Record<string, string> = {
    twitter: 'bg-[#1DA1F2] hover:bg-[#1A91DA]',
    facebook: 'bg-[#1877F2] hover:bg-[#166FE5]',
    // Gradiente "brand" do Instagram
    instagram: 'bg-gradient-to-r from-[#FEDA75] via-[#FA7E1E] to-[#E1306C] hover:from-[#FDCB5C] hover:via-[#F77737] hover:to-[#D62976]',
    whatsapp: 'bg-[#25D366] hover:bg-[#1EBE5D]',
    paypal: 'bg-[#0070E0] hover:bg-[#005FB8]',
    stripe: 'bg-[#635BFF] hover:bg-[#5851E8]',
    mercadopago: 'bg-[#00B1EA] hover:bg-[#009DD8]',
    google: 'bg-[#DC2626] hover:bg-[#B91C1C]',
    apple: 'bg-black hover:bg-neutral-800',
  };

  const buttonColorClass = brandColors[platform] || 'bg-gray-500 hover:bg-gray-600';
  const buttonTextClass = 'text-white';
  const buttonClass = `w-32 ${buttonColorClass} ${buttonTextClass}`.trim();

  // Debug: verificar se onSettings está sendo recebido
  if (platform === 'twitter') {
    console.log('[IntegrationCard] Twitter card renderizado. onSettings:', !!onSettings);
  }

  return (
    <Card className="w-full h-full flex flex-col min-h-[280px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 flex items-center justify-center rounded-lg flex-shrink-0">
              {icon}
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </div>
          </div>
          {onSettings && platform !== 'twitter' && (
            <Button
              onClick={() => {
                console.log('[IntegrationCard] Configurações clicadas para:', platform);
                onSettings();
              }}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-[#1DA1F2]"
              title="Configurar Bearer Token"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
        {permissions && permissions.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Permissões solicitadas:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {permissions.map((permission, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1.5 mt-0.5">•</span>
                  <span>{permission}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col space-y-2 mt-auto">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={isConnected ? onDisconnect : onConnect}
            disabled={isLoading}
            className={buttonClass}
          >
            {isLoading ? 'Carregando...' : (isConnected ? 'Desconectar' : 'Conectar')}
          </Button>
          {onSettings && platform === 'twitter' && (
            <Button
              onClick={() => {
                console.log('[IntegrationCard] Configurações clicadas para:', platform);
                onSettings();
              }}
              variant="outline"
              size="icon"
              className="h-10 w-10"
              title="Configurar Bearer Token"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          {extraAction && (
            <Button
              onClick={extraAction.onClick}
              disabled={extraAction.disabled}
              variant="outline"
              size="icon"
              title={extraAction.label}
              className={extraAction.className}
            >
              {extraAction.icon}
            </Button>
          )}
          {isConnected && onSync && (
            <Button onClick={onSync} disabled={syncing} variant="outline">
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
