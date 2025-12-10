import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Clock, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatSBTC, formatUSD, sbtcToUSD } from '@/lib/utils';
import { calculateLoanBreakdown, formatTimeRemaining, getUrgencyLevel, calculateRepaymentProgress } from '@/services/loanBreakdown.service';
import { cn } from '@/lib/utils';

interface LoanRepaymentBreakdownProps {
  loanAmount: bigint;
  borrowBlock: number;
  dueBlock: number;
  currentBlock: number;
  btcPrice: number;
  onRepay: () => void;
  isRepaying: boolean;
}

export function LoanRepaymentBreakdown({
  loanAmount,
  borrowBlock,
  dueBlock,
  currentBlock,
  btcPrice,
  onRepay,
  isRepaying,
}: LoanRepaymentBreakdownProps) {
  const breakdown = calculateLoanBreakdown(loanAmount, borrowBlock, dueBlock, currentBlock);
  const urgency = getUrgencyLevel(breakdown.daysRemaining, breakdown.isOverdue);
  const progress = calculateRepaymentProgress(borrowBlock, dueBlock, currentBlock);

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-blue-500" />
            Loan Repayment Details
          </CardTitle>
          <Badge variant={breakdown.isOverdue ? 'destructive' : 'default'} className={urgency.color}>
            {formatTimeRemaining(breakdown.daysRemaining, breakdown.isOverdue)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Urgency Alert */}
        {(breakdown.isOverdue || breakdown.daysRemaining <= 7) && (
          <div className={cn(
            "flex items-start gap-3 p-4 rounded-lg border",
            breakdown.isOverdue ? "bg-red-500/10 border-red-500/20" : "bg-yellow-500/10 border-yellow-500/20"
          )}>
            {breakdown.isOverdue ? (
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={cn("font-medium", urgency.color)}>
                {urgency.message}
              </p>
              {breakdown.isOverdue && (
                <p className="text-sm text-muted-foreground mt-1">
                  A {breakdown.penaltyRate}% penalty has been added to your loan
                </p>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Time elapsed</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Breakdown Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
              <span className="text-sm text-muted-foreground">Principal Amount</span>
            </div>
            <div className="text-right">
              <p className="font-medium">{formatSBTC(breakdown.principal)} sBTC</p>
              <p className="text-xs text-muted-foreground">
                {formatUSD(sbtcToUSD(breakdown.principal, btcPrice))}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
              <span className="text-sm text-muted-foreground">
                Interest ({breakdown.interestRate}% APR)
              </span>
            </div>
            <div className="text-right">
              <p className="font-medium">{formatSBTC(breakdown.interest)} sBTC</p>
              <p className="text-xs text-muted-foreground">
                {formatUSD(sbtcToUSD(breakdown.interest, btcPrice))}
              </p>
            </div>
          </div>

          {breakdown.penalty > BigInt(0) && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                <span className="text-sm text-muted-foreground">
                  Late Penalty ({breakdown.penaltyRate}%)
                </span>
              </div>
              <div className="text-right">
                <p className="font-medium text-red-500">{formatSBTC(breakdown.penalty)} sBTC</p>
                <p className="text-xs text-muted-foreground">
                  {formatUSD(sbtcToUSD(breakdown.penalty, btcPrice))}
                </p>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between py-2">
            <span className="font-semibold">Total Amount Due</span>
            <div className="text-right">
              <p className="text-xl font-bold">{formatSBTC(breakdown.totalDue)} sBTC</p>
              <p className="text-sm text-muted-foreground">
                {formatUSD(sbtcToUSD(breakdown.totalDue, btcPrice))}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={onRepay}
          disabled={isRepaying}
          className="w-full"
          size="lg"
          variant={breakdown.isOverdue ? 'destructive' : 'default'}
        >
          {isRepaying ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Processing Repayment...
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4 mr-2" />
              Repay {formatSBTC(breakdown.totalDue)} sBTC
            </>
          )}
        </Button>

        {/* Additional Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <div className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            <span>Block #{dueBlock}</span>
          </div>
          <span>{breakdown.daysRemaining} days remaining</span>
        </div>
      </CardContent>
    </Card>
  );
}
