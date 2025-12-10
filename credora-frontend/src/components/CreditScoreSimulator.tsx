import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowUp, ArrowDown, TrendingUp, Lightbulb, Calculator } from 'lucide-react';
import {
  calculateCreditScore,
  simulateOnTimeLoan,
  simulateLateLoan,
  simulateBalanceIncrease,
  getNextTierInfo,
  getImprovementRecommendations,
  formatBTC,
  getTierColor,
  getTierEmoji,
  TIER_LIMITS,
  type LoanHistory,
  type CreditScoreBreakdown,
} from '@/services/creditScoreSimulator.service';

interface CreditScoreSimulatorProps {
  currentAverageBalance: number;
  currentLoanHistory: LoanHistory;
  btcPrice: number;
}

export function CreditScoreSimulator({
  currentAverageBalance,
  currentLoanHistory,
  btcPrice,
}: CreditScoreSimulatorProps) {
  // Simulation state
  const [simulatedBalance, setSimulatedBalance] = useState(currentAverageBalance);
  const [simulatedLoanAmount, setSimulatedLoanAmount] = useState(10000);
  const [activeTab, setActiveTab] = useState('loan');

  // Calculate current score
  const currentScore = useMemo(
    () => calculateCreditScore(currentAverageBalance, currentLoanHistory),
    [currentAverageBalance, currentLoanHistory]
  );

  // Simulations
  const onTimeLoanSimulation = useMemo(
    () =>
      simulateOnTimeLoan(
        currentAverageBalance,
        currentLoanHistory,
        simulatedLoanAmount
      ),
    [currentAverageBalance, currentLoanHistory, simulatedLoanAmount]
  );

  const lateLoanSimulation = useMemo(
    () =>
      simulateLateLoan(
        currentAverageBalance,
        currentLoanHistory,
        simulatedLoanAmount
      ),
    [currentAverageBalance, currentLoanHistory, simulatedLoanAmount]
  );

  const balanceSimulation = useMemo(
    () =>
      simulateBalanceIncrease(
        currentAverageBalance,
        currentLoanHistory,
        simulatedBalance
      ),
    [currentAverageBalance, currentLoanHistory, simulatedBalance]
  );

  const nextTier = getNextTierInfo(currentScore);
  const recommendations = getImprovementRecommendations(
    currentScore,
    currentLoanHistory,
    currentAverageBalance
  );

  const ScoreComparison = ({
    current,
    projected,
    label,
  }: {
    current: CreditScoreBreakdown;
    projected: CreditScoreBreakdown;
    label: string;
  }) => {
    const scoreDelta = projected.totalScore - current.totalScore;
    const isPositive = scoreDelta > 0;

    return (
      <div className="space-y-4">
        {/* Score Change Alert */}
        <Alert className={isPositive 
          ? 'border-green-500/50 bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm' 
          : 'border-red-500/50 bg-gradient-to-r from-red-500/10 to-rose-500/10 backdrop-blur-sm'}>
          <AlertDescription className="flex items-center gap-2">
            {isPositive ? (
              <ArrowUp className="h-4 w-4 text-green-400" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-400" />
            )}
            <span className={isPositive ? 'text-green-300 font-medium' : 'text-red-300 font-medium'}>
              {label}
            </span>
          </AlertDescription>
        </Alert>

        {/* Score Comparison Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Current */}
          <div className="space-y-2">
            <p className="text-sm text-gray-400 font-medium">Current</p>
            <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-white">{current.totalScore}</span>
                <span className="text-2xl">{getTierEmoji(current.tier)}</span>
              </div>
              <Badge variant="outline" className={`${getTierColor(current.tier)} border-gray-600`}>
                {current.tierName}
              </Badge>
              <div className="space-y-2 text-sm pt-2 border-t border-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-400">Activity:</span>
                  <span className="font-semibold text-gray-200">{current.activityScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Repayment:</span>
                  <span className="font-semibold text-gray-200">{current.repaymentScore}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Projected */}
          <div className="space-y-2">
            <p className="text-sm text-blue-400 font-medium">Projected</p>
            <div className="rounded-xl border border-blue-500/50 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-white">{projected.totalScore}</span>
                <span className="text-2xl">{getTierEmoji(projected.tier)}</span>
              </div>
              <Badge variant="outline" className={`${getTierColor(projected.tier)} border-blue-400 bg-blue-900/30`}>
                {projected.tierName}
              </Badge>
              <div className="space-y-2 text-sm pt-2 border-t border-blue-400/30">
                <div className="flex justify-between">
                  <span className="text-blue-200">Activity:</span>
                  <span className="font-semibold text-white">{projected.activityScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-200">Repayment:</span>
                  <span className="font-semibold text-white">{projected.repaymentScore}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Score Delta */}
        <div className={`flex items-center justify-center gap-3 p-5 rounded-xl shadow-lg ${
          isPositive 
            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40' 
            : 'bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/40'
        }`}>
          {isPositive ? (
            <TrendingUp className="h-6 w-6 text-green-400" />
          ) : (
            <ArrowDown className="h-6 w-6 text-red-400" />
          )}
          <span className={`text-2xl font-bold ${
            isPositive ? 'text-green-300' : 'text-red-300'
          }`}>
            {isPositive ? '+' : ''}{scoreDelta} points
          </span>
        </div>

        {/* Loan Limit Impact */}
        {projected.finalLoanLimit !== current.finalLoanLimit && (
          <div className="rounded-xl border border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-5 space-y-3 shadow-lg">
            <p className="text-sm font-semibold text-purple-300 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Loan Limit Impact
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Current Limit:</span>
              <span className="font-medium text-gray-200">{formatBTC(current.finalLoanLimit)} BTC</span>
            </div>
            <div className="flex items-center justify-between text-sm pt-2 border-t border-purple-400/30">
              <span className="text-purple-200">Projected Limit:</span>
              <span className="font-bold text-lg text-purple-300">
                {formatBTC(projected.finalLoanLimit)} BTC
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          <CardTitle>Credit Score Simulator</CardTitle>
        </div>
        <CardDescription>
          See how different actions affect your credit score
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Score Overview */}
        <div className="rounded-2xl border border-indigo-500/40 p-6 space-y-4 bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-blue-500/20 backdrop-blur-sm shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-300 mb-2 font-medium">Your Current Score</p>
              <div className="flex items-center gap-4">
                <span className="text-5xl font-bold text-white">{currentScore.totalScore}</span>
                <span className="text-4xl">{getTierEmoji(currentScore.tier)}</span>
              </div>
            </div>
            <Badge className={`${getTierColor(currentScore.tier)} text-lg px-5 py-2 border border-indigo-400/50`}>
              {currentScore.tierName}
            </Badge>
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-blue-300 font-medium">Activity Score</span>
                <span className="text-sm font-bold text-white">{currentScore.activityScore}/300</span>
              </div>
              <Progress
                value={(currentScore.activityScore / 300) * 100}
                className="h-2.5 bg-gray-700"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-purple-300 font-medium">Repayment Score</span>
                <span className="text-sm font-bold text-white">{currentScore.repaymentScore}/700</span>
              </div>
              <Progress
                value={(currentScore.repaymentScore / 700) * 100}
                className="h-2.5 bg-gray-700"
              />
            </div>
          </div>

          {/* Next Tier Info */}
          {nextTier && (
            <Alert className="border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-yellow-500/15 backdrop-blur-sm">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              <AlertDescription className="text-amber-100">
                <strong className="text-amber-300">{nextTier.pointsNeeded} points</strong> needed to reach{' '}
                <strong className="text-amber-300">{nextTier.nextTierName}</strong> tier
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Simulation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="loan">On-Time Loan</TabsTrigger>
            <TabsTrigger value="late">Late Loan</TabsTrigger>
            <TabsTrigger value="balance">Increase Balance</TabsTrigger>
          </TabsList>

          {/* On-Time Loan Simulation */}
          <TabsContent value="loan" className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Loan Amount: {formatBTC(simulatedLoanAmount)} BTC
                </label>
                <Slider
                  value={[simulatedLoanAmount]}
                  onValueChange={(value) => setSimulatedLoanAmount(value[0])}
                  min={TIER_LIMITS.TIER_0}
                  max={TIER_LIMITS.TIER_5}
                  step={10000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  ~${((simulatedLoanAmount / 100000000) * btcPrice).toFixed(2)} USD
                </p>
              </div>
            </div>

            <ScoreComparison
              current={onTimeLoanSimulation.current}
              projected={onTimeLoanSimulation.projected}
              label={onTimeLoanSimulation.recommendation}
            />
          </TabsContent>

          {/* Late Loan Simulation */}
          <TabsContent value="late" className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Loan Amount: {formatBTC(simulatedLoanAmount)} BTC
                </label>
                <Slider
                  value={[simulatedLoanAmount]}
                  onValueChange={(value) => setSimulatedLoanAmount(value[0])}
                  min={TIER_LIMITS.TIER_0}
                  max={TIER_LIMITS.TIER_5}
                  step={10000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  ~${((simulatedLoanAmount / 100000000) * btcPrice).toFixed(2)} USD
                </p>
              </div>
            </div>

            <ScoreComparison
              current={lateLoanSimulation.current}
              projected={lateLoanSimulation.projected}
              label={lateLoanSimulation.recommendation}
            />
          </TabsContent>

          {/* Balance Increase Simulation */}
          <TabsContent value="balance" className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  New Average Balance: {formatBTC(simulatedBalance)} BTC
                </label>
                <Slider
                  value={[simulatedBalance]}
                  onValueChange={(value) => setSimulatedBalance(value[0])}
                  min={currentAverageBalance}
                  max={TIER_LIMITS.TIER_5}
                  step={10000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  ~${((simulatedBalance / 100000000) * btcPrice).toFixed(2)} USD
                </p>
              </div>
            </div>

            <ScoreComparison
              current={balanceSimulation.current}
              projected={balanceSimulation.projected}
              label={balanceSimulation.recommendation}
            />
          </TabsContent>
        </Tabs>

        {/* Recommendations */}
        <div className="rounded-xl border border-amber-500/40 p-5 space-y-3 bg-gradient-to-br from-amber-500/15 to-orange-500/15 backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-400" />
            <p className="font-semibold text-base text-amber-300">Personalized Tips</p>
          </div>
          <ul className="space-y-2.5">
            {recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-amber-100 flex items-start gap-2.5">
                <span className="mt-0.5 text-base">{rec.charAt(0)}</span>
                <span className="leading-relaxed">{rec.slice(1).trim()}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
