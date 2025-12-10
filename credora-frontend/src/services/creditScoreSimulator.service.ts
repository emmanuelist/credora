/**
 * Credit Score Simulator Service
 * 
 * Simulates how different actions affect credit score based on Credora's algorithm:
 * - Total Score: 0-1000 points
 * - Activity Score: 0-300 points (30% weight) - Based on 3-month average balance
 * - Repayment Score: 0-700 points (70% weight) - Based on loan history
 */

// Tier limits in satoshis (matches contract constants)
export const TIER_LIMITS = {
  TIER_0: 10000,      // 0.0001 BTC
  TIER_1: 50000,      // 0.0005 BTC
  TIER_2: 100000,     // 0.001 BTC
  TIER_3: 300000,     // 0.003 BTC
  TIER_4: 500000,     // 0.005 BTC
  TIER_5: 1000000,    // 0.01 BTC
} as const;

// Credit score thresholds for each tier
export const TIER_THRESHOLDS = {
  TIER_0: 300,
  TIER_1: 450,
  TIER_2: 600,
  TIER_3: 750,
  TIER_4: 900,
  TIER_5: 901,
} as const;

export interface CreditScoreBreakdown {
  totalScore: number;
  activityScore: number;
  repaymentScore: number;
  tier: number;
  tierName: string;
  maxLoanAmount: number;
  finalLoanLimit: number;
}

export interface SimulationResult {
  current: CreditScoreBreakdown;
  projected: CreditScoreBreakdown;
  scoreDelta: number;
  tierChange: number;
  loanLimitDelta: number;
  recommendation: string;
}

export interface LoanHistory {
  totalLoans: number;
  onTimeLoans: number;
  lateLoans: number;
}

/**
 * Calculate activity score based on average balance (0-300 points)
 * Matches contract's activity-score function
 */
export function calculateActivityScore(averageBalance: number): number {
  if (averageBalance === 0) return 0;
  if (averageBalance < TIER_LIMITS.TIER_0) return 0;
  if (averageBalance < TIER_LIMITS.TIER_1) return 100;
  if (averageBalance < TIER_LIMITS.TIER_2) return 220;
  if (averageBalance < TIER_LIMITS.TIER_3) return 240;
  if (averageBalance < TIER_LIMITS.TIER_4) return 260;
  if (averageBalance < TIER_LIMITS.TIER_5) return 280;
  return 300;
}

/**
 * Calculate repayment score based on loan history (0-700 points)
 * Matches contract's repayment-score function
 * New borrowers get a boost by dividing by (totalLoans + 5)
 */
export function calculateRepaymentScore(loanHistory: LoanHistory): number {
  const { totalLoans, onTimeLoans } = loanHistory;
  
  if (onTimeLoans === 0) return 0;
  
  // New borrowers (< 5 loans): soften impact of limited history
  if (totalLoans < 5) {
    return Math.floor((onTimeLoans * 700) / (totalLoans + 5));
  }
  
  // Established borrowers: standard percentage calculation
  return Math.floor((onTimeLoans * 700) / totalLoans);
}

/**
 * Calculate total credit score and determine tier
 */
export function calculateCreditScore(
  averageBalance: number,
  loanHistory: LoanHistory
): CreditScoreBreakdown {
  const activityScore = calculateActivityScore(averageBalance);
  const repaymentScore = calculateRepaymentScore(loanHistory);
  const totalScore = activityScore + repaymentScore;
  
  // Determine tier based on score thresholds
  let tier = 0;
  let tierName = 'Entry';
  let maxLoanAmount: number = TIER_LIMITS.TIER_0;
  
  if (totalScore > TIER_THRESHOLDS.TIER_4) {
    tier = 5;
    tierName = 'Diamond';
    maxLoanAmount = TIER_LIMITS.TIER_5;
  } else if (totalScore > TIER_THRESHOLDS.TIER_3) {
    tier = 4;
    tierName = 'Platinum';
    maxLoanAmount = TIER_LIMITS.TIER_4;
  } else if (totalScore > TIER_THRESHOLDS.TIER_2) {
    tier = 3;
    tierName = 'Gold';
    maxLoanAmount = TIER_LIMITS.TIER_3;
  } else if (totalScore > TIER_THRESHOLDS.TIER_1) {
    tier = 2;
    tierName = 'Silver';
    maxLoanAmount = TIER_LIMITS.TIER_2;
  } else if (totalScore > TIER_THRESHOLDS.TIER_0) {
    tier = 1;
    tierName = 'Bronze';
    maxLoanAmount = TIER_LIMITS.TIER_1;
  }
  
  // Final loan limit: min(tier limit, average balance)
  const finalLoanLimit = Math.min(maxLoanAmount, averageBalance);
  
  return {
    totalScore,
    activityScore,
    repaymentScore,
    tier,
    tierName,
    maxLoanAmount,
    finalLoanLimit,
  };
}

/**
 * Simulate impact of taking and repaying a loan on-time
 */
export function simulateOnTimeLoan(
  currentAverageBalance: number,
  currentLoanHistory: LoanHistory,
  loanAmount: number
): SimulationResult {
  const current = calculateCreditScore(currentAverageBalance, currentLoanHistory);
  
  // Project: one more loan, paid on time
  const projected = calculateCreditScore(currentAverageBalance, {
    totalLoans: currentLoanHistory.totalLoans + 1,
    onTimeLoans: currentLoanHistory.onTimeLoans + 1,
    lateLoans: currentLoanHistory.lateLoans,
  });
  
  const scoreDelta = projected.totalScore - current.totalScore;
  const tierChange = projected.tier - current.tier;
  const loanLimitDelta = projected.finalLoanLimit - current.finalLoanLimit;
  
  let recommendation = '';
  if (scoreDelta > 0) {
    recommendation = `Repaying this loan on-time will increase your credit score by ${scoreDelta} points!`;
    if (tierChange > 0) {
      recommendation += ` You'll advance to ${projected.tierName} tier!`;
    }
  } else if (currentLoanHistory.totalLoans === 0) {
    recommendation = 'Taking your first loan will establish your credit history. Repay on-time to build trust!';
  } else {
    recommendation = 'Your score is already optimized. Continue maintaining on-time repayments.';
  }
  
  return {
    current,
    projected,
    scoreDelta,
    tierChange,
    loanLimitDelta,
    recommendation,
  };
}

/**
 * Simulate impact of a late loan repayment
 */
export function simulateLateLoan(
  currentAverageBalance: number,
  currentLoanHistory: LoanHistory,
  loanAmount: number
): SimulationResult {
  const current = calculateCreditScore(currentAverageBalance, currentLoanHistory);
  
  // Project: one more loan, paid late
  const projected = calculateCreditScore(currentAverageBalance, {
    totalLoans: currentLoanHistory.totalLoans + 1,
    onTimeLoans: currentLoanHistory.onTimeLoans,
    lateLoans: currentLoanHistory.lateLoans + 1,
  });
  
  const scoreDelta = projected.totalScore - current.totalScore;
  const tierChange = projected.tier - current.tier;
  const loanLimitDelta = projected.finalLoanLimit - current.finalLoanLimit;
  
  const recommendation = `Warning: Late repayment will decrease your score by ${Math.abs(scoreDelta)} points${tierChange < 0 ? ` and drop you to ${projected.tierName} tier` : ''}. Always repay on-time!`;
  
  return {
    current,
    projected,
    scoreDelta,
    tierChange,
    loanLimitDelta,
    recommendation,
  };
}

/**
 * Simulate impact of increasing average balance
 */
export function simulateBalanceIncrease(
  currentAverageBalance: number,
  currentLoanHistory: LoanHistory,
  newAverageBalance: number
): SimulationResult {
  const current = calculateCreditScore(currentAverageBalance, currentLoanHistory);
  const projected = calculateCreditScore(newAverageBalance, currentLoanHistory);
  
  const scoreDelta = projected.totalScore - current.totalScore;
  const tierChange = projected.tier - current.tier;
  const loanLimitDelta = projected.finalLoanLimit - current.finalLoanLimit;
  
  let recommendation = '';
  if (scoreDelta > 0) {
    recommendation = `Increasing your average balance will boost your activity score by ${projected.activityScore - current.activityScore} points, giving you ${scoreDelta} total points!`;
    if (tierChange > 0) {
      recommendation += ` You'll reach ${projected.tierName} tier!`;
    }
  } else {
    recommendation = 'Your balance is already at the maximum activity score (300 points).';
  }
  
  return {
    current,
    projected,
    scoreDelta,
    tierChange,
    loanLimitDelta,
    recommendation,
  };
}

/**
 * Get next tier information and requirements
 */
export function getNextTierInfo(currentScore: CreditScoreBreakdown): {
  nextTier: number;
  nextTierName: string;
  pointsNeeded: number;
  nextTierLimit: number;
} | null {
  if (currentScore.tier >= 5) {
    return null; // Already at max tier
  }
  
  const tierMap = [
    { tier: 1, name: 'Bronze', threshold: TIER_THRESHOLDS.TIER_0, limit: TIER_LIMITS.TIER_1 },
    { tier: 2, name: 'Silver', threshold: TIER_THRESHOLDS.TIER_1, limit: TIER_LIMITS.TIER_2 },
    { tier: 3, name: 'Gold', threshold: TIER_THRESHOLDS.TIER_2, limit: TIER_LIMITS.TIER_3 },
    { tier: 4, name: 'Platinum', threshold: TIER_THRESHOLDS.TIER_3, limit: TIER_LIMITS.TIER_4 },
    { tier: 5, name: 'Diamond', threshold: TIER_THRESHOLDS.TIER_4, limit: TIER_LIMITS.TIER_5 },
  ];
  
  const nextTierInfo = tierMap.find(t => t.tier === currentScore.tier + 1);
  if (!nextTierInfo) return null;
  
  const pointsNeeded = nextTierInfo.threshold - currentScore.totalScore + 1;
  
  return {
    nextTier: nextTierInfo.tier,
    nextTierName: nextTierInfo.name,
    pointsNeeded,
    nextTierLimit: nextTierInfo.limit,
  };
}

/**
 * Generate personalized recommendations to improve credit score
 */
export function getImprovementRecommendations(
  currentScore: CreditScoreBreakdown,
  loanHistory: LoanHistory,
  averageBalance: number
): string[] {
  const recommendations: string[] = [];
  
  // Activity score recommendations
  if (currentScore.activityScore < 300) {
    const nextActivityThreshold = Object.values(TIER_LIMITS).find(
      limit => limit > averageBalance
    );
    if (nextActivityThreshold) {
      const satoshisNeeded = nextActivityThreshold - averageBalance;
      const btcNeeded = (satoshisNeeded / 100000000).toFixed(8);
      recommendations.push(
        `💰 Deposit ${btcNeeded} more BTC to reach the next activity tier and boost your score`
      );
    }
  }
  
  // Repayment score recommendations
  if (loanHistory.totalLoans === 0) {
    recommendations.push(
      '📈 Take your first loan to start building credit history'
    );
  } else if (loanHistory.totalLoans < 5) {
    recommendations.push(
      `🎯 Complete ${5 - loanHistory.totalLoans} more on-time loans to maximize your repayment score`
    );
  }
  
  if (loanHistory.lateLoans > 0) {
    const latePercentage = (loanHistory.lateLoans / loanHistory.totalLoans) * 100;
    recommendations.push(
      `⚠️ You have ${loanHistory.lateLoans} late payments (${latePercentage.toFixed(1)}%). Always repay on-time to improve your score`
    );
  }
  
  // Tier progression recommendations
  const nextTier = getNextTierInfo(currentScore);
  if (nextTier) {
    recommendations.push(
      `🏆 You need ${nextTier.pointsNeeded} more points to reach ${nextTier.nextTierName} tier`
    );
  } else {
    recommendations.push(
      '👑 Congratulations! You\'re at the maximum Diamond tier. Maintain your excellent credit!'
    );
  }
  
  return recommendations;
}

/**
 * Format satoshis to BTC display
 */
export function formatBTC(satoshis: number): string {
  return (satoshis / 100000000).toFixed(8);
}

/**
 * Get tier color for UI
 */
export function getTierColor(tier: number): string {
  const colors = {
    0: 'text-gray-400',
    1: 'text-amber-600',
    2: 'text-gray-300',
    3: 'text-yellow-500',
    4: 'text-purple-400',
    5: 'text-blue-400',
  };
  return colors[tier as keyof typeof colors] || colors[0];
}

/**
 * Get tier emoji for UI
 */
export function getTierEmoji(tier: number): string {
  const emojis = {
    0: '🥚',
    1: '🥉',
    2: '🥈',
    3: '🥇',
    4: '💎',
    5: '👑',
  };
  return emojis[tier as keyof typeof emojis] || emojis[0];
}
