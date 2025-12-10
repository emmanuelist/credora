import { Header } from '@/components/Header';
import { CreditScoreCard } from '@/components/CreditScoreCard';
import { LoanRepaymentBreakdown } from '@/components/LoanRepaymentBreakdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/forms/FormInput';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useCreditScore, useLoanInfo, useApplyForLoan, usePoolInfo, useRepayLoan } from '@/hooks/useCredoraContract';
import { useBTCPrice } from '@/hooks/useBTCPrice';
import { formatSBTC, parseToSBTC, formatUSD, sbtcToUSD, blocksToDays, formatDueDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { validateLoan } from '@/lib/validations';

export default function Borrow() {
  const [loanAmount, setLoanAmount] = useState('');
  const [step, setStep] = useState(1);

  const { data: creditScore, isLoading: loadingCredit } = useCreditScore();
  const { data: loanInfo } = useLoanInfo();
  const { data: poolInfo } = usePoolInfo();
  const { data: btcPrice = 100000 } = useBTCPrice();
  const applyLoanMutation = useApplyForLoan();
  const repayLoanMutation = useRepayLoan();

  const maxLoanAmount = creditScore ? (creditScore.total / 1000) * 0.01 : 0.003;
  const interestRate = 15;
  const duration = poolInfo ? blocksToDays(poolInfo.lockDuration) : 14;
  const hasActiveLoan = !!loanInfo && loanInfo.amount > BigInt(0);

  const handleRepay = async () => {
    try {
      await repayLoanMutation.mutateAsync();
      toast.success('Loan repaid successfully!');
    } catch (error: any) {
      console.error('Repayment error:', error);
      toast.error('Failed to repay loan', {
        description: error?.message || 'Please try again',
      });
    }
  };

  // Real-time validation
  const loanError = useMemo(
    () => validateLoan(loanAmount, maxLoanAmount, hasActiveLoan),
    [loanAmount, maxLoanAmount, hasActiveLoan]
  );

  const isLoanValid = loanAmount && !loanError && parseFloat(loanAmount) > 0;

  const calculateRepayment = () => {
    const amount = parseFloat(loanAmount || '0');
    const interest = amount * (interestRate / 100);
    return amount + interest;
  };

  const handleApply = () => {
    if (!loanAmount) {
      toast.error('Please enter a loan amount');
      return;
    }
    
    if (loanError) {
      toast.error(loanError);
      return;
    }
    
    setStep(2);
  };

  const handleConfirm = async () => {
    // Additional validation before submitting
    if (!poolInfo) {
      toast.error('Unable to fetch pool information');
      return;
    }

    const requestedAmount = parseToSBTC(loanAmount);
    
    // Check if pool has sufficient liquidity
    if (poolInfo.contractBalance < requestedAmount) {
      toast.error('Insufficient pool liquidity', {
        description: `Pool only has ${Number(poolInfo.contractBalance) / 100000000} sBTC available. Please request a smaller amount.`,
      });
      return;
    }

    try {
      const amount = parseToSBTC(loanAmount);
      await applyLoanMutation.mutateAsync(amount);
      toast.success('Loan approved! sBTC sent to your wallet.');
      setStep(3);
    } catch (error) {
      toast.error('Failed to apply for loan. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto p-6 space-y-8">
        <div className="text-center space-y-4 py-8">
          <h1 className="text-5xl font-bold gradient-text">
            Apply for Loan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Access instant liquidity based on your credit score. No collateral required.
          </p>
        </div>

        {/* Active Loan Repayment Section */}
        {hasActiveLoan && loanInfo && poolInfo && (
          <LoanRepaymentBreakdown
            loanAmount={loanInfo.amount}
            borrowBlock={loanInfo.startBlock}
            dueBlock={loanInfo.dueBlock}
            currentBlock={poolInfo.currentBlock}
            btcPrice={btcPrice}
            onRepay={handleRepay}
            isRepaying={repayLoanMutation.isPending}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Credit Score */}
          <div className="lg:col-span-1">
            {loadingCredit ? (
              <Skeleton className="h-96" />
            ) : creditScore ? (
              <CreditScoreCard creditScore={creditScore} />
            ) : null}
          </div>

          {/* Loan Application */}
          <div className="lg:col-span-2">
            {step === 1 && (
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle>Step 1 of 3: Loan Amount</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Eligibility Status */}
                  {hasActiveLoan ? (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <span className="font-semibold text-destructive">Active Loan Exists</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        You have an existing loan. Please repay it before applying for a new one.
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <span className="font-semibold text-success">Eligible for Loan</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Based on your credit score, you can borrow up to {maxLoanAmount.toFixed(4)} sBTC
                      </div>
                    </div>
                  )}

                  {/* Loan Amount Input */}
                  <FormInput
                    id="loan-amount"
                    label="Select Loan Amount"
                    value={loanAmount}
                    onChange={setLoanAmount}
                    error={loanError}
                    isValid={!!isLoanValid}
                    helperLeft={`Credit Limit: ${maxLoanAmount.toFixed(4)} sBTC`}
                    helperRight={`~${formatUSD(sbtcToUSD(parseToSBTC(loanAmount), btcPrice))}`}
                    onMaxClick={() => setLoanAmount(maxLoanAmount.toString())}
                    disabled={hasActiveLoan}
                    max={maxLoanAmount.toString()}
                  />

                  {/* Quick Select */}
                  <div className="space-y-2">
                    <Label>Quick Select</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[0.25, 0.5, 0.75, 1].map((percent) => {
                        const amount = maxLoanAmount * percent;
                        const isSelected = Math.abs(parseFloat(loanAmount || '0') - amount) < 0.0001;
                        return (
                          <Button
                            key={percent}
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setLoanAmount(amount.toString())}
                            disabled={hasActiveLoan}
                            className={isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
                          >
                            {percent * 100}%
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Loan Preview */}
                  <div className="p-4 rounded-lg bg-muted/20 space-y-3">
                    <div className="text-sm font-semibold">Loan Preview</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Loan Amount</span>
                        <span className="font-semibold">{loanAmount || '0'} sBTC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interest ({interestRate}%)</span>
                        <span className="font-semibold">
                          {(parseFloat(loanAmount || '0') * (interestRate / 100)).toFixed(5)} sBTC
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border/50">
                        <span className="font-semibold">Total Repayment</span>
                        <span className="font-bold text-primary">
                          {calculateRepayment().toFixed(5)} sBTC
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Due Date</span>
                        <span>Dec 7, 2025 ({duration} days)</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleApply}
                    className="w-full"
                    size="lg"
                    disabled={!isLoanValid || hasActiveLoan}
                    style={{ background: isLoanValid ? 'var(--gradient-accent)' : undefined }}
                  >
                    Next: Review Terms →
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle>Step 2 of 3: Terms Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-lg bg-muted/20 space-y-3">
                    <div className="text-base font-semibold">Loan Terms Summary</div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Loan Amount</span>
                        <span className="font-semibold">{loanAmount} sBTC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interest Rate</span>
                        <span className="font-semibold">{interestRate}% APR</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Loan Duration</span>
                        <span className="font-semibold">{duration} days</span>
                      </div>
                      <div className="flex justify-between text-base pt-2 border-t border-border/50">
                        <span className="font-semibold">Repayment Amount</span>
                        <span className="font-bold text-primary">
                          {calculateRepayment().toFixed(5)} sBTC
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Due Date</span>
                        <span>Dec 7, 2025</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="text-sm font-semibold mb-2">⚠️ Late Payment Penalty</div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Credit score will be reduced</li>
                      <li>• Future loan limits may decrease</li>
                      <li>• Marked as LATE in your repayment history</li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <Button
                      onClick={() => setStep(1)}
                      variant="outline"
                      className="flex-1"
                    >
                      ← Back
                    </Button>
                    <Button
                      onClick={handleConfirm}
                      disabled={applyLoanMutation.isPending}
                      className="flex-1"
                      style={{ background: 'var(--gradient-accent)' }}
                    >
                      {applyLoanMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Confirm & Sign →'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card className="glass border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-12 space-y-6">
                  <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center animate-in zoom-in duration-300">
                    <CheckCircle className="w-10 h-10 text-success" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">Loan Approved!</h3>
                    <p className="text-muted-foreground">
                      {loanAmount} sBTC has been sent to your wallet
                    </p>
                  </div>

                  <div className="w-full max-w-md p-4 rounded-lg bg-muted/20 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount Received</span>
                      <span className="font-semibold">{loanAmount} sBTC</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Due Date</span>
                      <span className="font-semibold">Dec 7, 2025</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Repayment Amount</span>
                      <span className="font-semibold text-primary">
                        {calculateRepayment().toFixed(5)} sBTC
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Apply for Another Loan
                    </Button>
                    <Button
                      style={{ background: 'var(--gradient-primary)' }}
                      onClick={() => window.location.href = '/'}
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
