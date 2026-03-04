import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartBarProps {
  label: string;
  value: number;
  percentage: number;
  color?: string;
}

interface SimpleChartProps {
  title: string;
  data: ChartBarProps[];
  description?: string;
}

export function SimpleChart({ title, data, description }: SimpleChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-sm text-muted-foreground">{item.value}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    item.color || 'bg-primary'
                  }`}
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ProgressRingProps {
  title: string;
  value: number;
  max: number;
  suffix?: string;
  description?: string;
  color?: string;
}

export function ProgressRing({
  title,
  value,
  max,
  suffix = '%',
  description,
  color = '#3b82f6',
}: ProgressRingProps) {
  const percentage = (value / max) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-6">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-muted"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{Math.round(percentage)}</span>
            <span className="text-xs text-muted-foreground">{suffix}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          {value} de {max}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-2 text-center">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
