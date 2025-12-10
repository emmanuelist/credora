import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LoanInfo } from '@/types/credora.types';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActiveLoanCardProps {
  loan: LoanInfo | null;
  onRepay?: () => void;
}

export function ActiveLoanCard({ loan, onRepay }: ActiveLoanCardProps) {
  if (!loan) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Active Loan</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Ready to borrow? Check your eligibility and apply for a loan to access instant liquidity.
          </p>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = loan.isOverdue ? 100 : ((14 - loan.daysRemaining) / 14) * 100;
  const amountStr = (Number(loan.amount) / 1e8).toFixed(4);
  const repaymentStr = (Number(loan.repaymentAmount) / 1e8).toFixed(4);
  const interestStr = ((Number(loan.repaymentAmount) - Number(loan.amount)) / 1e8).toFixed(4);

  return (
    <Card className={`glass border-border/50 ${loan.isOverdue ? 'border-destructive/50' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Active Loan</CardTitle>
          {loan.isOverdue ? (
            <Badge variant="destructive" className="font-semibold">
              <AlertTriangle className="w-3 h-3 mr-1" />
              OVERDUE
            </Badge>
          ) : (
            <Badge variant="default" className="font-semibold bg-success">
              ACTIVE
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Loan Amount</span>
            <span className="text-lg font-bold">{amountStr} sBTC</span>
          </div>
          
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Borrowed {formatDistanceToNow(new Date(loan.issuedBlock))} ago</span>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm">
              <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
              <span className={loan.isOverdue ? 'text-destructive' : 'text-foreground'}>
                {loan.isOverdue ? 'Payment Overdue' : `${loan.daysRemaining} days remaining`}
              </span>
            </div>
          </div>
          
          <Progress 
            value={progressPercentage} 
            className={`h-2 ${loan.isOverdue ? 'bg-destructive/20' : ''}`}
          />
        </div>

        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="text-sm font-semibold mb-2">Repayment Details</div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Principal</span>
            <span>{amountStr} sBTC</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Interest ({loan.interestRate}%)</span>
            <span>{interestStr} sBTC</span>
          </div>
          
          <div className="flex justify-between text-base font-bold pt-2 border-t border-border/50">
            <span>Total Repayment</span>
            <span className="gradient-text">{repaymentStr} sBTC</span>
          </div>
        </div>

        {loan.isOverdue && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="text-sm font-semibold text-destructive mb-1">
              ⚠️ Payment Overdue
            </div>
            <p className="text-xs text-muted-foreground">
              Your loan is overdue. This will negatively impact your credit score and future borrowing limits.
            </p>
          </div>
        )}

        <Button 
          onClick={onRepay}
          className="w-full"
          style={{ background: 'var(--gradient-primary)' }}
          size="lg"
        >
          {loan.isOverdue ? 'Repay Now (Urgent)' : 'Repay Loan'}
        </Button>
      </CardContent>
    </Card>
  );
}
