import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  action?: React.ReactNode;
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, action }: MetricCardProps) {
  return (
    <Card className="glass hover-scale group border-border/50 hover:border-primary/50 transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold gradient-text">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
        {trend && (
          <div className="flex items-center mt-2 text-xs">
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3 mr-1 text-success" />
            ) : (
              <TrendingDown className="w-3 h-3 mr-1 text-destructive" />
            )}
            <span className={trend.isPositive ? 'text-success' : 'text-destructive'}>
              {trend.value}
            </span>
            <span className="text-muted-foreground ml-1">vs last period</span>
          </div>
        )}
        {action && (
          <div className="mt-4">
            {action}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
