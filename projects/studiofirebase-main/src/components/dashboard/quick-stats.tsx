import { Card, CardContent } from '@/components/ui/card';
import { Flame, TrendingUp, Zap } from 'lucide-react';

interface QuickStatProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

function QuickStat({ label, value, icon, highlight = false }: QuickStatProps) {
  return (
    <div className={`p-3 rounded-lg border ${
      highlight 
        ? 'border-primary/50 bg-primary/5' 
        : 'border-border/50 bg-muted/30'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <div className="text-primary">{icon}</div>
        <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

interface QuickStatsProps {
  stats?: {
    trending: string;
    popular: string;
    recommended: string;
  };
}

export function QuickStats({ stats = {
  trending: '12 novos',
  popular: '5 recomendados',
  recommended: 'Ver mais',
} }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <QuickStat
        label="Em Tendência"
        value={stats.trending}
        icon={<Flame className="w-4 h-4" />}
      />
      <QuickStat
        label="Mais Populares"
        value={stats.popular}
        icon={<TrendingUp className="w-4 h-4" />}
        highlight
      />
      <QuickStat
        label="Para Você"
        value={stats.recommended}
        icon={<Zap className="w-4 h-4" />}
      />
    </div>
  );
}
