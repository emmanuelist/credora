import { Header } from '@/components/Header';
import { MetricCard } from '@/components/MetricCard';
import { CreditScoreCard } from '@/components/CreditScoreCard';
import { CreditScoreGauge } from '@/components/CreditScoreGauge';
import { ActiveLoanCard } from '@/components/ActiveLoanCard';
import { CreditScoreSimulator } from '@/components/CreditScoreSimulator';
import { CreditScoreHistoryChart } from '@/components/CreditScoreHistoryChart';
import { CreditScoreChart } from '@/components/CreditScoreChart';
import { EarningsChart } from '@/components/EarningsChart';
import { PoolUtilizationChart } from '@/components/PoolUtilizationChart';
import { LoanEligibilityChecker } from '@/components/LoanEligibilityChecker';
import { EarningsCalculator } from '@/components/EarningsCalculator';
import { TransactionHistoryTable } from '@/components/TransactionHistoryTable';
import { useWalletStore } from '@/stores/walletStore';
import { Wallet, TrendingUp, Coins, DollarSign, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreditScore, useLoanInfo, useLenderInfo, usePoolInfo, useRepayLoan, useSBTCBalance } from '@/hooks/useCredoraContract';
import { useBTCPrice } from '@/hooks/useBTCPrice';
import { formatSBTC, formatUSD, sbtcToUSD } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Dashboard() {
  const { isWalletConnected } = useWalletStore();
  const navigate = useNavigate();
  
  const { data: creditScore, isLoading: loadingCredit } = useCreditScore();
  const { data: loanInfo, isLoading: loadingLoan } = useLoanInfo();
  const { data: lenderInfo, isLoading: loadingLender } = useLenderInfo();
  const { data: poolInfo, isLoading: loadingPool } = usePoolInfo();
  const { data: sbtcBalance } = useSBTCBalance();
  const { data: btcPrice = 100000 } = useBTCPrice();
  const repayMutation = useRepayLoan();

  // Debug: Log lenderInfo to verify earnings
  if (lenderInfo && !loadingLender) {
    console.log('📊 Dashboard lenderInfo:', {
      balance: lenderInfo.balance.toString(),
      poolBalance: lenderInfo.poolBalance.toString(),
      earnings: lenderInfo.earnings.toString(),
      isLocked: lenderInfo.isLocked,
    });
  }

  const handleRepay = async () => {
    if (!loanInfo) return;
    
    // Check sBTC balance before repaying
    if (sbtcBalance && sbtcBalance < loanInfo.repaymentAmount) {
      toast.error('Insufficient sBTC balance', {
        description: `You need ${Number(loanInfo.repaymentAmount) / 100000000} sBTC but only have ${Number(sbtcBalance) / 100000000} sBTC`,
      });
      return;
    }

    try {
      await repayMutation.mutateAsync(loanInfo.repaymentAmount);
    } catch (error) {
      console.error('Repay error:', error);
    }
  };

  if (!isWalletConnected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-2xl">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
              <Wallet className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold gradient-text">
              Welcome to Credora Protocol
            </h1>
            <p className="text-lg text-muted-foreground">
              Trust-scored Bitcoin lending without traditional collateral. Lend sBTC to earn yield or borrow based on your on-chain reputation.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-success">10-20%</div>
                <div className="text-sm text-muted-foreground">APY for Lenders</div>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">Instant</div>
                <div className="text-sm text-muted-foreground">Loan Approval</div>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">Zero</div>
                <div className="text-sm text-muted-foreground">Collateral</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto p-6 space-y-8 animate-fade-in">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-5xl font-bold gradient-text">
            Your DeFi Dashboard
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Manage your lending positions, track credit score, and access instant liquidity
          </p>
        </div>

        {/* Top Row - Credit Score & Active Loan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loadingCredit ? (
            <Skeleton className="h-64" />
          ) : creditScore ? (
            <CreditScoreGauge 
              accountData={{
                totalLoans: creditScore.totalLoans || BigInt(0),
                onTimeLoans: creditScore.onTimeLoans || BigInt(0),
                lateLoans: creditScore.lateLoans || BigInt(0),
              }}
              averageBalance={creditScore.averageBalance || BigInt(0)}
            />
          ) : null}
          
          {loadingLoan ? (
            <Skeleton className="h-64" />
          ) : (
            <ActiveLoanCard 
              loan={loanInfo} 
              onRepay={handleRepay}
            />
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingPool ? (
            <Skeleton className="h-32" />
          ) : poolInfo ? (
            <MetricCard
              title="Total Pool Size"
              value={formatUSD(sbtcToUSD(poolInfo.totalPool, btcPrice))}
              subtitle={`${formatSBTC(poolInfo.totalPool)} sBTC`}
              icon={Wallet}
              trend={{ value: `${poolInfo.utilizationRate}% utilized`, isPositive: poolInfo.utilizationRate < 90 }}
            />
          ) : null}
          
          {loadingPool ? (
            <Skeleton className="h-32" />
          ) : poolInfo ? (
            <MetricCard
              title="Current APY"
              value={`${poolInfo.currentAPY.toFixed(2)}%`}
              subtitle="Annual Percentage Yield"
              icon={TrendingUp}
            />
          ) : null}
          
          {loadingLender ? (
            <Skeleton className="h-32" />
          ) : lenderInfo ? (
            <MetricCard
              title="Your Deposits"
              value={formatUSD(sbtcToUSD(lenderInfo.poolBalance, btcPrice))}
              subtitle={`${formatSBTC(lenderInfo.poolBalance)} sBTC deposited`}
              icon={Coins}
            />
          ) : null}
          
          {loadingLender ? (
            <Skeleton className="h-32" />
          ) : lenderInfo ? (
            <MetricCard
              title="Your Earnings"
              value={formatUSD(sbtcToUSD(lenderInfo.earnings, btcPrice))}
              subtitle={`${formatSBTC(lenderInfo.earnings)} sBTC earned`}
              icon={DollarSign}
              trend={{ 
                value: lenderInfo.poolBalance > BigInt(0) 
                  ? `+${((Number(lenderInfo.earnings) / Number(lenderInfo.poolBalance)) * 100).toFixed(1)}%` 
                  : '0%', 
                isPositive: true 
              }}
            />
          ) : null}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass p-6 rounded-lg border border-border/50 hover:border-primary/50 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">Lend sBTC</h3>
                <p className="text-sm text-muted-foreground">
                  Deposit sBTC and earn up to 20% APY with flexible withdrawal
                </p>
              </div>
              <div className="p-3 rounded-lg bg-success/10 group-hover:bg-success/20 transition-colors">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
            <Button 
              className="w-full"
              style={{ background: 'var(--gradient-success)' }}
            >
              Start Lending
            </Button>
          </div>

          <div className="glass p-6 rounded-lg border border-border/50 hover:border-accent/50 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">Borrow Funds</h3>
                <p className="text-sm text-muted-foreground">
                  Access instant liquidity based on your credit score
                </p>
              </div>
              <div className="p-3 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <Coins className="w-6 h-6 text-accent" />
              </div>
            </div>
            <Button 
              className="w-full"
              style={{ background: 'var(--gradient-accent)' }}
            >
              Apply for Loan
            </Button>
          </div>
        </div>

        {/* Analytics and Tools Tabs */}
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>
          
          <TabsContent value="analytics" className="space-y-6 mt-6">
            {/* Credit Score History Chart */}
            {isWalletConnected && (
              <CreditScoreHistoryChart 
                address={useWalletStore.getState().address || ''} 
              />
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CreditScoreChart />
              <EarningsChart />
            </div>
            <PoolUtilizationChart 
              utilized={poolInfo ? poolInfo.utilizationRate / 100 : 0.65}
              available={poolInfo ? 1 - poolInfo.utilizationRate / 100 : 0.35}
            />
          </TabsContent>
          
          <TabsContent value="tools" className="space-y-6 mt-6">
            {/* Credit Score Simulator */}
            {creditScore && (
              <CreditScoreSimulator
                currentAverageBalance={Number(creditScore.averageBalance || BigInt(0))}
                currentLoanHistory={{
                  totalLoans: Number(creditScore.totalLoans || BigInt(0)),
                  onTimeLoans: Number(creditScore.onTimeLoans || BigInt(0)),
                  lateLoans: Number(creditScore.lateLoans || BigInt(0)),
                }}
                btcPrice={btcPrice}
              />
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LoanEligibilityChecker
                creditScore={creditScore?.total || 0}
                maxLoanAmount={creditScore ? creditScore.total / 100 : 0}
                currentDebt={loanInfo && loanInfo.amount > BigInt(0) ? Number(loanInfo.amount) / 1e8 : 0}
              />
              <EarningsCalculator currentAPY={poolInfo?.currentAPY || 15} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Recent Transactions */}
        <TransactionHistoryTable showHeader={true} limit={5} />

        {/* Info Banner */}
        <div className="glass p-6 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/20">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Build Your Credit Score</h4>
              <p className="text-sm text-muted-foreground">
                Maintain higher sBTC balance and repay loans on time to unlock higher borrowing limits and better rates.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
