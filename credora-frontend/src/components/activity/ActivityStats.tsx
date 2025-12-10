import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity, CheckCircle } from 'lucide-react';

interface ActivityStatsProps {
  totalTransactions: number;
  totalDeposited: string;
  totalBorrowed: string;
  completedLoans: number;
  totalLoans: number;
}

export function ActivityStats({
  totalTransactions,
  totalDeposited,
  totalBorrowed,
  completedLoans,
  totalLoans,
}: ActivityStatsProps) {
  const stats = [
    {
      title: 'Total Transactions',
      value: totalTransactions.toString(),
      icon: Activity,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Total Deposited',
      value: totalDeposited,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Total Borrowed',
      value: totalBorrowed,
      icon: TrendingDown,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Loans Completed',
      value: `${completedLoans}/${totalLoans}`,
      subtitle: totalLoans > 0 ? `${Math.round((completedLoans / totalLoans) * 100)}% on-time` : 'No loans yet',
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="glass border-border/50 hover:border-primary/30 transition-all duration-300">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
