import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  colorClass?: string;
}

const colorMap: Record<string, string> = {
  teal: 'border-t-[hsl(173,58%,39%)] bg-[hsl(173,58%,39%,0.05)]',
  amber: 'border-t-[hsl(38,92%,50%)] bg-[hsl(38,92%,50%,0.05)]',
  rose: 'border-t-[hsl(0,72%,51%)] bg-[hsl(0,72%,51%,0.05)]',
  sky: 'border-t-[hsl(199,89%,48%)] bg-[hsl(199,89%,48%,0.05)]',
  emerald: 'border-t-[hsl(160,84%,39%)] bg-[hsl(160,84%,39%,0.05)]',
  purple: 'border-t-[hsl(270,60%,50%)] bg-[hsl(270,60%,50%,0.05)]',
};

const iconColorMap: Record<string, string> = {
  teal: 'text-[hsl(173,58%,39%)]',
  amber: 'text-[hsl(38,92%,50%)]',
  rose: 'text-[hsl(0,72%,51%)]',
  sky: 'text-[hsl(199,89%,48%)]',
  emerald: 'text-[hsl(160,84%,39%)]',
  purple: 'text-[hsl(270,60%,50%)]',
};

export default function StatCard({ title, value, icon: Icon, trend, trendUp, colorClass = 'teal' }: StatCardProps) {
  return (
    <div className={cn(
      'rounded-lg border border-t-4 p-5 transition-shadow hover:shadow-md',
      colorMap[colorClass] || colorMap.teal
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tabular-nums font-[Noto_Kufi_Arabic]">{value}</p>
          {trend && (
            <p className={cn('text-xs font-medium', trendUp ? 'text-[hsl(160,84%,39%)]' : 'text-[hsl(0,72%,51%)]')}>
              {trend}
            </p>
          )}
        </div>
        <div className={cn('rounded-lg p-2.5', iconColorMap[colorClass] || iconColorMap.teal)}>
          <Icon className="size-6" />
        </div>
      </div>
    </div>
  );
}
