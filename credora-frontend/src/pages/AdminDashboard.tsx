import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Activity, 
  AlertTriangle,
  RefreshCw,
  Shield,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  calculatePlatformMetrics,
  getTopUsers,
  getCachedMetrics,
  cacheMetrics,
  formatBTC,
  formatUSD,
  getHealthColor,
  type PlatformMetrics,
  type UserActivity,
} from '@/services/adminDashboard.service';

const BTC_PRICE = 96000; // Mock BTC price

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [topUsers, setTopUsers] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);

      // Try cache first
      const cached = getCachedMetrics();
      if (cached) {
        setMetrics(cached);
        setLoading(false);
      }

      // Fetch fresh data
      const [metricsData, usersData] = await Promise.all([
        calculatePlatformMetrics(),
        getTopUsers(10),
      ]);

      setMetrics(metricsData);
      setTopUsers(usersData);
      cacheMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadDashboardData();
  }

  if (loading && !metrics) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Failed to load dashboard data</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Chart data
  const utilizationData = [
    { name: 'Available', value: Number(metrics.tvl.availableLiquidity), color: '#10b981' },
    { name: 'Borrowed', value: Number(metrics.tvl.totalBorrowed), color: '#3b82f6' },
  ];

  const loanStatusData = [
    { name: 'Active', value: metrics.loans.totalActiveLoans, color: '#3b82f6' },
    { name: 'Repaid', value: metrics.loans.totalRepaid, color: '#10b981' },
    { name: 'Defaulted', value: metrics.loans.defaultedLoans, color: '#ef4444' },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform-wide metrics and analytics</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Pool Health Alert */}
      {metrics.performance.poolHealth !== 'healthy' && (
        <Alert variant={metrics.performance.poolHealth === 'critical' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Pool health status: <strong className="capitalize">{metrics.performance.poolHealth}</strong>
            {' - '}Utilization rate at {metrics.tvl.utilizationRate.toFixed(1)}%
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Value Locked */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Value Locked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {formatBTC(metrics.tvl.totalValueLocked)} BTC
              </p>
              <p className="text-sm text-gray-500">
                ${formatUSD(metrics.tvl.totalValueLocked, BTC_PRICE)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Active Loans */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active Loans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{metrics.loans.totalActiveLoans}</p>
              <p className="text-sm text-gray-500">
                {formatBTC(metrics.tvl.totalBorrowed)} BTC borrowed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Utilization Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Utilization Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{metrics.tvl.utilizationRate.toFixed(1)}%</p>
              <Badge className={getHealthColor(metrics.performance.poolHealth)}>
                {metrics.performance.poolHealth}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{metrics.users.activeUsers}</p>
              <p className="text-sm text-gray-500">
                +{metrics.users.newUsersLast30Days} last 30 days
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pool Utilization Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Pool Utilization</CardTitle>
            <CardDescription>Distribution of pool liquidity</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={utilizationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {utilizationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatBTC(BigInt(value)) + ' BTC'} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Loan Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Loan Status Distribution</CardTitle>
            <CardDescription>Breakdown of all loans issued</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={loanStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6">
                  {loanStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Average APY</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">{metrics.performance.averageAPY.toFixed(2)}%</p>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Interest Earned</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatBTC(metrics.performance.totalInterestEarned)} BTC
            </p>
            <p className="text-sm text-gray-500">
              ${formatUSD(metrics.performance.totalInterestEarned, BTC_PRICE)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Default Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">{metrics.loans.defaultRate.toFixed(1)}%</p>
              {metrics.loans.defaultRate > 10 ? (
                <TrendingDown className="h-5 w-5 text-red-600" />
              ) : (
                <Shield className="h-5 w-5 text-green-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Users</CardTitle>
          <CardDescription>Most active users by total volume</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Deposited</TableHead>
                <TableHead className="text-right">Borrowed</TableHead>
                <TableHead className="text-right">Credit Score</TableHead>
                <TableHead className="text-right">Loans</TableHead>
                <TableHead className="text-right">Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No user data available
                  </TableCell>
                </TableRow>
              ) : (
                topUsers.map((user) => (
                  <TableRow key={user.address}>
                    <TableCell className="font-mono text-sm">
                      {user.address.slice(0, 8)}...{user.address.slice(-6)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBTC(user.totalDeposited)} BTC
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBTC(user.totalBorrowed)} BTC
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {user.creditScore}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.loanCount} ({user.onTimePayments} on-time)
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          user.riskLevel === 'low'
                            ? 'text-green-600'
                            : user.riskLevel === 'medium'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }
                      >
                        {user.riskLevel}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
