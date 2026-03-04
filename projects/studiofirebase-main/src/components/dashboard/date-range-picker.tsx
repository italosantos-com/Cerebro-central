import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useState } from 'react';

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  onDateRangeChange?: (range: DateRange) => void;
  presets?: 'today' | 'week' | 'month' | 'custom';
}

export function DateRangePicker({ onDateRangeChange }: DateRangePickerProps) {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: firstDayOfMonth, to: today };
  });

  const handlePresetClick = (preset: string) => {
    const today = new Date();
    let newRange: DateRange;

    switch (preset) {
      case 'today':
        newRange = { from: today, to: today };
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        newRange = { from: weekAgo, to: today };
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        newRange = { from: monthAgo, to: today };
        break;
      default:
        return;
    }

    setDateRange(newRange);
    onDateRangeChange?.(newRange);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-3">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
        </span>
      </div>

      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => handlePresetClick('today')}
        >
          Hoje
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => handlePresetClick('week')}
        >
          7 Dias
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => handlePresetClick('month')}
        >
          30 Dias
        </Button>
      </div>
    </div>
  );
}
