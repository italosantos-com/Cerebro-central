import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, MessageSquare, ShoppingBag, TrendingUp } from 'lucide-react';

interface Activity {
  id: string;
  type: 'subscriber' | 'purchase' | 'review' | 'message';
  title: string;
  description: string;
  timestamp: Date;
  user?: string;
}

interface RecentActivityProps {
  activities?: Activity[];
}

export function RecentActivity({ activities = [] }: RecentActivityProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'subscriber':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'purchase':
        return <ShoppingBag className="w-4 h-4 text-green-500" />;
      case 'review':
        return <TrendingUp className="w-4 h-4 text-amber-500" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      default:
        return <TrendingUp className="w-4 h-4 text-primary" />;
    }
  };

  const getActivityLabel = (type: string) => {
    const labels = {
      subscriber: 'Novo Assinante',
      purchase: 'Compra Realizada',
      review: 'Avaliação',
      message: 'Mensagem',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getActivityColor = (type: string) => {
    const colors = {
      subscriber: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      purchase: 'bg-green-500/10 text-green-600 dark:text-green-400',
      review: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      message: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    };
    return colors[type as keyof typeof colors] || colors.message;
  };

  const mockActivities: Activity[] = [
    {
      id: '1',
      type: 'purchase',
      title: 'Compra de vídeo premium',
      description: 'João Silva comprou "Tutorial de Shibari Avançado"',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      user: 'João Silva',
    },
    {
      id: '2',
      type: 'subscriber',
      title: 'Novo assinante',
      description: 'Maria Santos assinou o plano Premium',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      user: 'Maria Santos',
    },
    {
      id: '3',
      type: 'message',
      title: 'Chat da comunidade',
      description: 'Novo comentário em "Bem-vindo ao Studio"',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      user: 'Pedro Oliveira',
    },
    {
      id: '4',
      type: 'review',
      title: 'Avaliação de produto',
      description: 'Novo comentário sobre "Bastidores #5" - 5 estrelas',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      user: 'Ana Costa',
    },
  ];

  const displayActivities = activities.length > 0 ? activities : mockActivities;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `há ${diffMins}m`;
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays < 7) return `há ${diffDays}d`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ⚡ Atividades Recentes
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {displayActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-muted">
                {getActivityIcon(activity.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">{activity.title}</h4>
                  <Badge className={`text-xs font-medium ${getActivityColor(activity.type)}`}>
                    {getActivityLabel(activity.type)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{activity.description}</p>
                <p className="text-xs text-muted-foreground/60 mt-2">{formatTime(activity.timestamp)}</p>
              </div>

              <div className="flex-shrink-0 text-right">
                {activity.user && (
                  <p className="text-xs font-medium text-foreground">{activity.user}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
