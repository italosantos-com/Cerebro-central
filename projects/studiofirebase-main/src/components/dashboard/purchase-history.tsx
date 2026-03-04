import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface Purchase {
  id: string;
  title: string;
  thumbnail: string;
  price: number;
  date: Date;
  type: 'video' | 'photo' | 'bundle';
  status: 'completed' | 'pending' | 'expired';
}

interface PurchaseHistoryProps {
  purchases: Purchase[];
  onViewClick?: (id: string) => void;
  isLoading?: boolean;
}

export function PurchaseHistory({ purchases, onViewClick, isLoading = false }: PurchaseHistoryProps) {
  const getTypeLabel = (type: string) => {
    const labels = {
      video: 'Vídeo',
      photo: 'Foto/Galeria',
      bundle: 'Pacote',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      completed: 'bg-green-500/10 text-green-600 dark:text-green-400',
      pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
      expired: 'bg-red-500/10 text-red-600 dark:text-red-400',
    };
    return colors[status as keyof typeof colors] || colors.completed;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      completed: 'Liberado',
      pending: 'Sendo processado',
      expired: 'Expirado',
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Histórico de Compras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Histórico de Compras
        </CardTitle>
        <Badge variant="outline">{purchases.length}</Badge>
      </CardHeader>

      <CardContent>
        {purchases.length === 0 ? (
          <div className="text-center py-12">
            <Play className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Você ainda não tem compras.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors group"
              >
                {/* Thumbnail */}
                <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden">
                  <Image
                    src={purchase.thumbnail}
                    alt={purchase.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {purchase.status === 'completed' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-6 h-6 text-white" fill="white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{purchase.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {purchase.date.toLocaleDateString('pt-BR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                {/* Type & Status */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {getTypeLabel(purchase.type)}
                  </Badge>
                  <Badge className={`text-xs ${getStatusColor(purchase.status)}`}>
                    {getStatusLabel(purchase.status)}
                  </Badge>
                </div>

                {/* Price & Action */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-bold text-primary">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(purchase.price)}
                  </span>
                  {purchase.status === 'completed' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewClick?.(purchase.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
