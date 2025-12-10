import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  calculateActivityScore, 
  calculateRepaymentScore, 
  calculateTotalScore,
  getTierFromScore,
  getNextTierInfo,
  getTierProgress,
  getScoreColor,
  TIER_INFO,
  TIER_LIMITS
} from '@/services/creditScore.service';
import { formatSBTC } from '@/lib/utils';
import { Award, TrendingUp, ChevronRight, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CreditScoreGaugeProps {
  accountData: {
    totalLoans: bigint;
    onTimeLoans: bigint;
    lateLoans: bigint;
  };
  averageBalance: bigint;
}

export function CreditScoreGauge({ accountData, averageBalance }: CreditScoreGaugeProps) {
  // Calculate scores
  const activityScore = calculateActivityScore(averageBalance);
  const repaymentScore = calculateRepaymentScore(
    accountData.totalLoans,
    accountData.onTimeLoans,
    accountData.lateLoans
  );
  const totalScore = calculateTotalScore(activityScore, repaymentScore);
  
  // Get tier info
  const currentTier = getTierFromScore(totalScore);
  const tierInfo = TIER_INFO[currentTier];
  const nextTier = getNextTierInfo(totalScore);
  const tierProgress = getTierProgress(totalScore);
  const scoreColor = getScoreColor(totalScore);

  // Calculate percentages for visual display
  const scorePercentage = (totalScore / 1000) * 100;
  const activityPercentage = (activityScore / 300) * 100;
  const repaymentPercentage = (repaymentScore / 700) * 100;

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Credit Score
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Your credit score determines your borrowing limit. It's based on your
                  repayment history (70%) and on-chain activity (30%).
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="flex items-center justify-center">
          <div className="relative">
            {/* Circular gauge background */}
            <svg className="transform -rotate-90" width="200" height="200">
              {/* Background circle */}
              <circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="12"
                opacity="0.2"
              />
              {/* Progress circle */}
              <circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke={scoreColor}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(scorePercentage / 100) * 534} 534`}
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: `drop-shadow(0 0 8px ${scoreColor}40)`,
                }}
              />
            </svg>
            
            {/* Score text in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-bold gradient-text">
                {totalScore}
              </div>
              <div className="text-sm text-muted-foreground">out of 1000</div>
            </div>
          </div>
        </div>

        {/* Current Tier Badge */}
        <div className="flex items-center justify-center gap-3">
          <Badge 
            className="text-base px-4 py-1.5"
            style={{ 
              backgroundColor: `${tierInfo.color}20`,
              color: tierInfo.color,
              borderColor: tierInfo.color,
            }}
          >
            <Award className="w-4 h-4 mr-2" />
            Tier {currentTier}: {tierInfo.name}
          </Badge>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {tierInfo.description}
        </p>

        {/* Score Breakdown */}
        <div className="space-y-4 pt-4 border-t border-border/50">
          <div className="text-sm font-medium">Score Breakdown</div>
          
          {/* Repayment Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Repayment Score</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Based on your loan repayment history. On-time payments earn maximum points.
                        New borrowers get a boost for their first 5 loans.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="font-medium">
                {repaymentScore} <span className="text-muted-foreground">/ 700</span>
              </span>
            </div>
            <Progress value={repaymentPercentage} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {Number(accountData.onTimeLoans)} on-time out of {Number(accountData.totalLoans)} total loans
            </div>
          </div>

          {/* Activity Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Activity Score</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Based on your 3-month average sBTC balance. Higher balances indicate
                        more "skin in the game" and lower default risk.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="font-medium">
                {activityScore} <span className="text-muted-foreground">/ 300</span>
              </span>
            </div>
            <Progress value={activityPercentage} className="h-2" />
            <div className="text-xs text-muted-foreground">
              3-month avg: {formatSBTC(averageBalance)}
            </div>
          </div>
        </div>

        {/* Next Tier Progress */}
        {nextTier && (
          <div className="space-y-3 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="font-medium">Progress to {nextTier.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {Math.round(tierProgress)}%
              </span>
            </div>
            <Progress value={tierProgress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{nextTier.pointsNeeded} points needed</span>
              <span className="flex items-center gap-1">
                Unlock {formatSBTC(BigInt(nextTier.loanLimit))} limit
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        )}

        {/* Current Loan Limit */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Current Loan Limit</div>
              <div className="text-2xl font-bold text-primary">
                {formatSBTC(BigInt(TIER_LIMITS[currentTier]))}
              </div>
            </div>
            <Award className="w-8 h-8 text-primary opacity-50" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
