import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Award, Clock } from 'lucide-react';
import {
  reconstructCreditScoreHistory,
  getCreditScoreStatistics,
  getCachedCreditScoreHistory,
  cacheCreditScoreHistory,
  type CreditScoreSnapshot,
} from '@/services/creditScoreHistory.service';
import { getTierColor, getTierEmoji } from '@/services/creditScoreSimulator.service';

interface CreditScoreHistoryChartProps {
  address: string;
}

export function CreditScoreHistoryChart({ address }: CreditScoreHistoryChartProps) {
  const [history, setHistory] = useState<CreditScoreSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setError(null);

        // Try to get from cache first
        const cached = getCachedCreditScoreHistory(address);
        if (cached && cached.length > 0) {
          setHistory(cached);
          setLoading(false);
          return;
        }

        // Fetch and reconstruct from blockchain
        const reconstructed = await reconstructCreditScoreHistory(address);
        setHistory(reconstructed);
        
        // Cache for future use
        if (reconstructed.length > 0) {
          cacheCreditScoreHistory(address, reconstructed);
        }
      } catch (err) {
        console.error('Failed to load credit score history:', err);
        setError('Failed to load credit score history');
      } finally {
        setLoading(false);
      }
    }

    if (address) {
      loadHistory();
    }
  }, [address]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit Score History</CardTitle>
          <CardDescription>Loading your credit history...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-[300px] w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit Score History</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit Score History</CardTitle>
          <CardDescription>Track your credit score evolution over time</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              No credit history yet. Make your first deposit or take a loan to start building your credit score!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const stats = getCreditScoreStatistics(history);
  const chartData = history.map((snapshot) => ({
    timestamp: new Date(snapshot.timestamp * 1000).toLocaleDateString(),
    score: snapshot.totalScore,
    activityScore: snapshot.activityScore,
    repaymentScore: snapshot.repaymentScore,
    event: snapshot.event,
    eventDetails: snapshot.eventDetails,
    tierName: snapshot.tierName,
  }));

  const getEventIcon = (event: string) => {
    switch (event) {
      case 'deposit':
        return '💰';
      case 'borrow':
        return '📤';
      case 'repay_ontime':
        return '✅';
      case 'repay_late':
        return '⚠️';
      default:
        return '📍';
    }
  };

  const getEventColor = (event: string) => {
    switch (event) {
      case 'deposit':
        return '#10b981'; // green
      case 'borrow':
        return '#3b82f6'; // blue
      case 'repay_ontime':
        return '#22c55e'; // green
      case 'repay_late':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
            <span className="text-2xl">{getEventIcon(data.event)}</span>
            <div className="flex-1">
              <p className="font-semibold text-sm text-white">{data.eventDetails}</p>
              <p className="text-xs text-gray-400">{data.timestamp}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Total Score</span>
              <span className="font-bold text-lg text-blue-400">{data.score}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Activity</span>
              <span className="text-sm text-gray-200">{data.activityScore}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Repayment</span>
              <span className="text-sm text-gray-200">{data.repaymentScore}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-700">
              <span className="text-xs text-gray-400">Tier</span>
              <Badge 
                variant="outline" 
                className="text-xs border-gray-600 bg-gray-800 text-gray-200"
              >
                {data.tierName}
              </Badge>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Credit Score History</CardTitle>
            <CardDescription>Your on-chain credit score evolution</CardDescription>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {stats.currentScore} pts
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics Overview */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Award className="h-4 w-4" />
                  <span>Highest Score</span>
                </div>
                <p className="text-2xl font-bold">{stats.highestScore}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {stats.scoreImprovement >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span>Score Change</span>
                </div>
                <p className={`text-2xl font-bold ${stats.scoreImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.scoreImprovement >= 0 ? '+' : ''}{stats.scoreImprovement}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Total Events</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalEvents}</p>
                <p className="text-xs text-gray-500">
                  {stats.positiveEvents} positive, {stats.negativeEvents} negative
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Score Chart */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Score Evolution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis 
                domain={[0, 1000]}
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Tier threshold lines */}
              <ReferenceLine y={300} stroke="#9ca3af" strokeDasharray="3 3" label="Bronze" />
              <ReferenceLine y={450} stroke="#9ca3af" strokeDasharray="3 3" label="Silver" />
              <ReferenceLine y={600} stroke="#fbbf24" strokeDasharray="3 3" label="Gold" />
              <ReferenceLine y={750} stroke="#a78bfa" strokeDasharray="3 3" label="Platinum" />
              <ReferenceLine y={900} stroke="#60a5fa" strokeDasharray="3 3" label="Diamond" />
              
              <Area
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#scoreGradient)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Event Timeline */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Event Timeline</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {history.slice().reverse().map((snapshot, index) => (
              <div
                key={`${snapshot.blockHeight}-${index}`}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${getEventColor(snapshot.event)}20` }}
                >
                  {getEventIcon(snapshot.event)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{snapshot.eventDetails}</p>
                    <Badge variant="outline" className="text-xs">
                      {snapshot.totalScore} pts
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Block #{snapshot.blockHeight} •{' '}
                    {new Date(snapshot.timestamp * 1000).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Activity Score</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(history[history.length - 1].activityScore / 300) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {history[history.length - 1].activityScore}/300
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Repayment Score</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${(history[history.length - 1].repaymentScore / 700) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {history[history.length - 1].repaymentScore}/700
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
