import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CreditScore, TIER_CONFIG, getCreditTier } from '@/types/credora.types';
import { Trophy, Star, TrendingUp } from 'lucide-react';

interface CreditScoreCardProps {
  creditScore: CreditScore;
}

export function CreditScoreCard({ creditScore }: CreditScoreCardProps) {
  const tierConfig = TIER_CONFIG[creditScore.tier];
  const progressPercentage = ((creditScore.total - tierConfig.min) / (tierConfig.max - tierConfig.min)) * 100;
  
  const nextTier = creditScore.tier === 'diamond' 
    ? null 
    : Object.values(TIER_CONFIG).find(t => t.min > tierConfig.max);

  const getTierStars = (tier: string) => {
    const stars = { entry: 1, bronze: 2, silver: 3, gold: 4, platinum: 5, diamond: 5 };
    return stars[tier as keyof typeof stars] || 1;
  };

  const tierColor = `var(--tier-${creditScore.tier})`;

  return (
    <Card className="glass border-border/50 overflow-hidden relative group">
      <div 
        className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity"
        style={{
          background: `radial-gradient(circle at center, ${tierColor}, transparent)`,
        }}
      />
      
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Credit Score</CardTitle>
          <Badge 
            className="font-semibold text-sm px-3 py-1"
            style={{ 
              backgroundColor: tierColor,
              color: creditScore.tier === 'entry' ? 'white' : 'black',
            }}
          >
            <Trophy className="w-3 h-3 mr-1" />
            {tierConfig.label.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="flex flex-col items-center py-4">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 flex items-center justify-center relative overflow-hidden"
                 style={{ borderColor: tierColor }}>
              <div 
                className="absolute inset-0 pulse-glow"
                style={{ backgroundColor: tierColor, opacity: 0.1 }}
              />
              <div className="text-center z-10">
                <div className="text-4xl font-bold" style={{ color: tierColor }}>
                  {creditScore.total}
                </div>
                <div className="flex items-center justify-center mt-1">
                  {[...Array(getTierStars(creditScore.tier))].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" style={{ color: tierColor }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <div className="text-sm text-muted-foreground">Score Range</div>
            <div className="text-lg font-semibold">
              {tierConfig.min} - {tierConfig.max}
            </div>
          </div>
        </div>

        {/* Progress to Next Tier */}
        {nextTier && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress to {nextTier.label}</span>
              <span className="font-semibold">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="text-xs text-muted-foreground text-center">
              {nextTier.min - creditScore.total} points to upgrade
            </div>
          </div>
        )}

        {/* Score Breakdown */}
        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="text-sm font-semibold">Score Breakdown</div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Activity Score</span>
              <span className="text-sm font-semibold">{creditScore.activityScore}/300</span>
            </div>
            <Progress value={(creditScore.activityScore / 300) * 100} className="h-1.5" />
            
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm text-muted-foreground">Repayment Score</span>
              <span className="text-sm font-semibold">{creditScore.repaymentScore}/700</span>
            </div>
            <Progress value={(creditScore.repaymentScore / 700) * 100} className="h-1.5" />
          </div>
        </div>

        {/* Improvement Tips */}
        <div className="space-y-2 pt-4 border-t border-border/50">
          <div className="text-sm font-semibold flex items-center">
            <TrendingUp className="w-4 h-4 mr-2 text-success" />
            How to Improve
          </div>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span>Maintain higher sBTC balance (+{300 - creditScore.activityScore} pts possible)</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span>Repay loans on time (+{700 - creditScore.repaymentScore} pts possible)</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
