import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingDown, TrendingUp, Activity } from 'lucide-react';

interface Insight {
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
  action?: string;
}

interface InsightsProps {
  insights: Insight[];
}

export function BusinessInsights({ insights = [] }: InsightsProps) {
  const getInsightColor = (type: string) => {
    const colors = {
      warning: 'border-amber-500/30 bg-amber-500/5',
      success: 'border-green-500/30 bg-green-500/5',
      info: 'border-blue-500/30 bg-blue-500/5',
    };
    return colors[type as keyof typeof colors] || colors.info;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'success':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'info':
        return <Activity className="w-5 h-5 text-blue-500" />;
      default:
        return <Activity className="w-5 h-5 text-blue-500" />;
    }
  };

  const defaultInsights: Insight[] = [
    {
      type: 'success',
      title: 'Taxa de Conversão em Alta',
      description: 'Seus produtos estão com 23% mais vendas essa semana comparedado ao período anterior.',
      action: 'Ver detalhes',
    },
    {
      type: 'warning',
      title: 'Avaliações Pendentes',
      description: 'Você tem 0 comentários aguardando moderação. Fique atento aos feedbacks dos usuários.',
      action: 'Ver moderação',
    },
    {
      type: 'info',
      title: 'Novo Produto Sugerido',
      description: 'Com base nas buscas, considere adicionar conteúdo sobre "Pet Play Avançado".',
      action: 'Criar produto',
    },
  ];

  const displayInsights = insights.length > 0 ? insights : defaultInsights;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          💡 Insights de Negócio
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {displayInsights.map((insight, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-lg border ${getInsightColor(insight.type)} transition-all duration-300 hover:shadow-md`}
          >
            <div className="flex items-start gap-3">
              {getIcon(insight.type)}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">{insight.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                {insight.action && (
                  <button className="mt-2 text-xs font-medium text-primary hover:underline">
                    {insight.action} →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
