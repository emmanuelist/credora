import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PoolUtilizationChartProps {
  utilized?: number;
  available?: number;
}

export function PoolUtilizationChart({ utilized = 0.65, available = 0.35 }: PoolUtilizationChartProps) {
  const data = [
    { name: 'Utilized', value: utilized },
    { name: 'Available', value: available },
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted))'];

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle>Pool Utilization</CardTitle>
        <CardDescription>Current lending pool distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
                color: 'hsl(var(--popover-foreground))',
              }}
              formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
            />
            <Legend 
              wrapperStyle={{ 
                color: 'hsl(var(--foreground))' 
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
