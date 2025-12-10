import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface LoanEligibilityCheckerProps {
  creditScore?: number;
  maxLoanAmount?: number;
  currentDebt?: number;
}

export function LoanEligibilityChecker({ 
  creditScore = 0, 
  maxLoanAmount = 0,
  currentDebt = 0 
}: LoanEligibilityCheckerProps) {
  const getTierInfo = (score: number) => {
    if (score >= 750) return { tier: 'Diamond', color: 'text-tier-diamond', limit: 1.0 };
    if (score >= 700) return { tier: 'Platinum', color: 'text-tier-platinum', limit: 0.5 };
    if (score >= 650) return { tier: 'Gold', color: 'text-tier-gold', limit: 0.25 };
    if (score >= 600) return { tier: 'Silver', color: 'text-tier-silver', limit: 0.1 };
    if (score >= 550) return { tier: 'Bronze', color: 'text-tier-bronze', limit: 0.05 };
    return { tier: 'Entry', color: 'text-tier-entry', limit: 0.025 };
  };

  const tierInfo = getTierInfo(creditScore);
  const availableCredit = Math.max(0, maxLoanAmount - currentDebt);
  const utilizationRate = maxLoanAmount > 0 ? (currentDebt / maxLoanAmount) * 100 : 0;

  const eligibilityChecks = [
    { label: 'Credit Score', met: creditScore >= 550, value: creditScore },
    { label: 'No Active Default', met: true, value: 'Verified' },
    { label: 'Wallet Age', met: true, value: '90+ days' },
  ];

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle>Loan Eligibility</CardTitle>
        <CardDescription>Check your borrowing capacity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Credit Tier */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Credit Tier</span>
            <Badge className={`${tierInfo.color} bg-transparent border-current`}>
              {tierInfo.tier}
            </Badge>
          </div>
          <Progress value={(creditScore / 850) * 100} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Score: {creditScore}</span>
            <span>Max: 850</span>
          </div>
        </div>

        {/* Available Credit */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Available Credit</span>
            <span className="text-lg font-bold text-success">
              {availableCredit.toFixed(4)} sBTC
            </span>
          </div>
          <Progress value={100 - utilizationRate} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Used: {currentDebt.toFixed(4)} sBTC</span>
            <span>Limit: {maxLoanAmount.toFixed(4)} sBTC</span>
          </div>
        </div>

        {/* Eligibility Checks */}
        <div className="space-y-3">
          <span className="text-sm font-medium">Requirements</span>
          {eligibilityChecks.map((check, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-background/50">
              <div className="flex items-center gap-2">
                {check.met ? (
                  <CheckCircle className="w-4 h-4 text-success" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive" />
                )}
                <span className="text-sm">{check.label}</span>
              </div>
              <span className="text-sm text-muted-foreground">{check.value}</span>
            </div>
          ))}
        </div>

        {/* Next Tier Info */}
        {creditScore < 750 && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
              <div className="text-xs">
                <p className="font-medium mb-1">Increase Your Limit</p>
                <p className="text-muted-foreground">
                  Reach {creditScore < 550 ? 550 : creditScore < 600 ? 600 : creditScore < 650 ? 650 : creditScore < 700 ? 700 : 750} credit score to unlock the next tier and higher borrowing limits.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
