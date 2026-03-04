import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
}

export function KPICard({
  title,
  value,
  change,
  icon,
  suffix = '',
  trend = 'neutral',
  description,
}: KPICardProps) {
  const getTrendColor = () => {
    if (!change) return 'text-muted-foreground';
    return trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-blue-500';
  };

  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50 bg-gradient-to-br from-card via-card to-card/90">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
              {title}
            </p>
            <div className="flex items-baseline gap-2 mb-2">
              <h3 className="text-3xl font-bold text-foreground">{value}</h3>
              {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
        </div>

        {change !== undefined && (
          <div className={`mt-4 flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
            {trend === 'up' && <ArrowUp className="w-4 h-4" />}
            {trend === 'down' && <ArrowDown className="w-4 h-4" />}
            {trend === 'neutral' && <TrendingUp className="w-4 h-4" />}
            <span>
              {Math.abs(change) > 0 ? `${Math.abs(change)}%` : 'Sem mudanças'}{' '}
            </span>
            <span className="text-muted-foreground">vs. mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
