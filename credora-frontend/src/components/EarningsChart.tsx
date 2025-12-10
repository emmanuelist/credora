import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface EarningsChartProps {
  data?: Array<{ month: string; earnings: number }>;
}

export function EarningsChart({ data }: EarningsChartProps) {
  // Mock data if none provided
  const chartData = data || [
    { month: 'Jan', earnings: 0.00012 },
    { month: 'Feb', earnings: 0.00018 },
    { month: 'Mar', earnings: 0.00024 },
    { month: 'Apr', earnings: 0.00031 },
    { month: 'May', earnings: 0.00038 },
    { month: 'Jun', earnings: 0.00045 },
  ];

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle>Monthly Earnings</CardTitle>
        <CardDescription>Your lending earnings over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <defs>
              <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={1} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
                color: 'hsl(var(--popover-foreground))',
              }}
              formatter={(value: number) => [`${value.toFixed(8)} sBTC`, 'Earnings']}
            />
            <Bar
              dataKey="earnings"
              fill="url(#earningsGradient)"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
