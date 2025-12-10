import { Header } from '@/components/Header';
import { MetricCard } from '@/components/MetricCard';
import { WithdrawTestCard } from '@/components/WithdrawTestCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/forms/FormInput';
import { Wallet, TrendingUp, Clock, DollarSign, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { usePoolInfo, useLenderInfo, useLend, useWithdraw, useSBTCBalance } from '@/hooks/useCredoraContract';
import { useBTCPrice } from '@/hooks/useBTCPrice';
import { formatSBTC, formatUSD, sbtcToUSD, parseToSBTC, blocksToDays, formatDueDate } from '@/lib/utils';
import { useWalletStore } from '@/stores/walletStore';
import { Skeleton } from '@/components/ui/skeleton';
import { validateDeposit, validateWithdraw } from '@/lib/validations';
import { calculateAPY, formatAPY, getAPYColor, getUtilizationStatus } from '@/services/apy.service';

export default function Lending() {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  
  const { balance } = useWalletStore();
  const { data: poolInfo, isLoading: loadingPool } = usePoolInfo();
  const { data: lenderInfo, isLoading: loadingLender } = useLenderInfo();
  const { data: sbtcBalance } = useSBTCBalance();
  const { data: btcPrice = 100000 } = useBTCPrice();
  const lendMutation = useLend();
  const withdrawMutation = useWithdraw();

  // Calculate real-time APY based on pool utilization
  const apyData = useMemo(() => {
    if (!poolInfo) return null;
    return calculateAPY(poolInfo.totalPool, poolInfo.totalBorrowed);
  }, [poolInfo]);

  const utilizationStatus = useMemo(() => {
    if (!apyData) return null;
    return getUtilizationStatus(apyData.utilizationRate);
  }, [apyData]);

  // Real-time validation
  const availableBalance = sbtcBalance ? Number(formatSBTC(sbtcBalance)) : 0;
  const poolBalance = Number(formatSBTC(lenderInfo?.poolBalance || BigInt(0)));
  const isLocked = lenderInfo?.isLocked || false;

  const depositError = useMemo(
    () => validateDeposit(depositAmount, availableBalance),
    [depositAmount, availableBalance]
  );

  const withdrawError = useMemo(
    () => validateWithdraw(withdrawAmount, poolBalance, isLocked),
    [withdrawAmount, poolBalance, isLocked]
  );

  const isDepositValid = depositAmount && !depositError && parseFloat(depositAmount) > 0;
  const isWithdrawValid = withdrawAmount && !withdrawError && parseFloat(withdrawAmount) > 0 && !isLocked;

  const handleDeposit = async () => {
    if (!depositAmount) {
      toast.error('Please enter an amount');
      return;
    }
    
    if (depositError) {
      toast.error(depositError);
      return;
    }
    
    try {
      const amount = parseToSBTC(depositAmount);
      await lendMutation.mutateAsync(amount);
      toast.success(`Successfully deposited ${depositAmount} sBTC!`);
      setDepositAmount('');
    } catch (error: any) {
      console.error('Deposit error:', error);
      const errorMessage = error?.message || 'Failed to deposit. Please try again.';
      toast.error('Failed to deposit', {
        description: errorMessage,
      });
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) {
      toast.error('Please enter an amount');
      return;
    }
    
    if (withdrawError) {
      toast.error(withdrawError);
      return;
    }
    
    try {
      const amount = parseToSBTC(withdrawAmount);
      await withdrawMutation.mutateAsync(amount);
      toast.success(`Successfully withdrew ${withdrawAmount} sBTC!`);
      setWithdrawAmount('');
    } catch (error) {
      toast.error('Failed to withdraw. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto p-6 space-y-8">
        <div className="text-center space-y-4 py-8">
          <h1 className="text-5xl font-bold gradient-text">
            Lending Pool
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Deposit sBTC to earn yield. Withdraw anytime after the lock period ends.
          </p>
        </div>

        {/* Pool Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          ) : apyData ? (
            <MetricCard
              title="Current APY"
              value={formatAPY(apyData.currentAPY)}
              subtitle={`Base ${apyData.baseAPY}% + ${apyData.utilizationBonus.toFixed(1)}% bonus`}
              icon={TrendingUp}
              trend={{ value: utilizationStatus?.message || '', isPositive: apyData.utilizationRate < 90 }}
            />
          ) : null}
          
          {loadingPool ? (
            <Skeleton className="h-32" />
          ) : poolInfo ? (
            <MetricCard
              title="Lock Period"
              value={`${blocksToDays(poolInfo.lockDuration)} days`}
              subtitle="Minimum duration"
              icon={Clock}
            />
          ) : null}
          
          {loadingLender ? (
            <Skeleton className="h-32" />
          ) : lenderInfo ? (
            <MetricCard
              title="Your Deposits"
              value={formatUSD(sbtcToUSD(lenderInfo.poolBalance, btcPrice))}
              subtitle={`${formatSBTC(lenderInfo.poolBalance)} sBTC`}
              icon={DollarSign}
            />
          ) : null}
        </div>

        {/* Test Withdrawal Card - Only show when unlocked */}
        {lenderInfo && !lenderInfo.isLocked && lenderInfo.poolBalance > BigInt(0) && (
          <WithdrawTestCard
            poolBalance={lenderInfo.poolBalance}
            earnings={lenderInfo.earnings}
            isLocked={lenderInfo.isLocked}
            unlockBlock={lenderInfo.unlockBlock}
            btcPrice={btcPrice}
            onWithdraw={async (amount) => {
              try {
                await withdrawMutation.mutateAsync(amount);
                toast.success('Test withdrawal successful!');
              } catch (error: any) {
                console.error('Withdraw error:', error);
                toast.error('Withdrawal failed', {
                  description: error?.message || 'Please try again',
                });
              }
            }}
            isPending={withdrawMutation.isPending}
          />
        )}

        {/* Deposit & Withdraw Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deposit Card */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-success" />
                Deposit sBTC
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormInput
                id="deposit-amount"
                label="Amount"
                value={depositAmount}
                onChange={setDepositAmount}
                error={depositError}
                isValid={!!isDepositValid}
                helperLeft={`Available: ${formatSBTC(balance)} sBTC`}
                helperRight={formatUSD(sbtcToUSD(parseToSBTC(depositAmount), btcPrice))}
                onMaxClick={() => setDepositAmount(formatSBTC(balance))}
                disabled={lendMutation.isPending}
              />

              <div className="p-4 rounded-lg bg-muted/20 space-y-2">
                <div className="text-sm font-semibold">Projected Earnings ({poolInfo ? blocksToDays(poolInfo.lockDuration) : 14} days)</div>
                <div className="text-2xl font-bold text-success">
                  +{formatUSD(sbtcToUSD(parseToSBTC(depositAmount), btcPrice) * ((poolInfo?.currentAPY || 15) / 100) * (blocksToDays(poolInfo?.lockDuration || 2016) / 365))}
                </div>
                <div className="text-xs text-muted-foreground">
                  Based on current APY: {poolInfo?.currentAPY.toFixed(2) || '15.2'}%
                </div>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Lock Period</span>
                  <span className="font-semibold">{poolInfo ? blocksToDays(poolInfo.lockDuration) : 14} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Withdrawal Available</span>
                  <span className="font-semibold">{poolInfo ? formatDueDate(150000 + poolInfo.lockDuration) : 'After lock period'}</span>
                </div>
              </div>

              <Button
                onClick={handleDeposit}
                disabled={lendMutation.isPending || !isDepositValid}
                className="w-full"
                size="lg"
                style={{ background: isDepositValid ? 'var(--gradient-success)' : undefined }}
              >
                {lendMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Depositing...
                  </>
                ) : (
                  `Deposit ${depositAmount || '0'} sBTC`
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Withdraw Card */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="w-5 h-5 mr-2 text-primary" />
                Withdraw sBTC
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormInput
                id="withdraw-amount"
                label="Amount"
                value={withdrawAmount}
                onChange={setWithdrawAmount}
                error={withdrawError}
                isValid={!!isWithdrawValid}
                helperLeft={`Pool Balance: ${formatSBTC(lenderInfo?.poolBalance || BigInt(0))} sBTC`}
                helperRight={formatUSD(sbtcToUSD(parseToSBTC(withdrawAmount), btcPrice))}
                onMaxClick={() => setWithdrawAmount(formatSBTC(lenderInfo?.poolBalance || BigInt(0)))}
                disabled={withdrawMutation.isPending || isLocked}
              />

              {isLocked ? (
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 space-y-2">
                  <div className="text-sm font-semibold text-warning">🔒 Locked</div>
                  <div className="text-xs text-muted-foreground">
                    Your funds will unlock at block {lenderInfo?.unlockBlock}. 
                    Available for withdrawal: {formatDueDate(lenderInfo?.unlockBlock || 0)}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-success/10 border border-success/20 space-y-2">
                  <div className="text-sm font-semibold text-success">✓ Unlocked</div>
                  <div className="text-xs text-muted-foreground">
                    Your funds are available for withdrawal. No penalties apply.
                  </div>
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pool Balance</span>
                  <span className="font-semibold">{formatSBTC(lenderInfo?.poolBalance || BigInt(0))} sBTC</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Earnings</span>
                  <span className="font-semibold text-success">
                    {formatSBTC(lenderInfo?.earnings || BigInt(0))} sBTC
                    {lenderInfo && lenderInfo.poolBalance > BigInt(0) && (
                      <span className="ml-1">
                        (+{((Number(lenderInfo.earnings) / Number(lenderInfo.poolBalance)) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleWithdraw}
                disabled={withdrawMutation.isPending || !isWithdrawValid}
                className="w-full"
                size="lg"
                variant="outline"
              >
                {withdrawMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Withdrawing...
                  </>
                ) : (
                  `Withdraw ${withdrawAmount || '0'} sBTC`
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
