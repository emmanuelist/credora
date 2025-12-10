/**
 * Credit Score Calculation Service
 * Implements the Credora credit scoring algorithm matching the smart contract logic
 */

// Tier limits (in satoshis)
export const TIER_LIMITS = {
  0: 10000,      // 0.0001 BTC
  1: 50000,      // 0.0005 BTC
  2: 100000,     // 0.001 BTC
  3: 300000,     // 0.003 BTC
  4: 500000,     // 0.005 BTC
  5: 1000000,    // 0.01 BTC
} as const;

// Tier names and descriptions
export const TIER_INFO = {
  0: { name: 'Entry', color: '#94a3b8', description: 'Starting tier for new borrowers' },
  1: { name: 'Bronze', color: '#cd7f32', description: 'Establishing credit history' },
  2: { name: 'Silver', color: '#c0c0c0', description: 'Building reputation' },
  3: { name: 'Gold', color: '#ffd700', description: 'Strong credit profile' },
  4: { name: 'Platinum', color: '#e5e4e2', description: 'Excellent borrower' },
  5: { name: 'Diamond', color: '#b9f2ff', description: 'Top tier borrower' },
} as const;

// Credit score thresholds for tiers
export const TIER_THRESHOLDS = {
  0: 0,
  1: 300,
  2: 450,
  3: 600,
  4: 750,
  5: 900,
} as const;

/**
 * Calculate activity score based on 3-month average sBTC balance
 * Matches contract logic from activity-score function
 * @param averageBalance - 3-month average balance in satoshis
 * @returns Activity score (0-300 points)
 */
export function calculateActivityScore(averageBalance: bigint): number {
  const balance = Number(averageBalance);
  
  if (balance === 0) return 0;
  if (balance < TIER_LIMITS[0]) return 0;
  if (balance < TIER_LIMITS[1]) return 100;
  if (balance < TIER_LIMITS[2]) return 220;
  if (balance < TIER_LIMITS[3]) return 240;
  if (balance < TIER_LIMITS[4]) return 260;
  if (balance < TIER_LIMITS[5]) return 280;
  return 300; // >= 1,000,000 sats
}

/**
 * Calculate repayment score based on loan history
 * Matches contract logic from repayment-score function
 * New borrowers get a boost by dividing by (total_loans + 5)
 * @param totalLoans - Total number of loans taken
 * @param onTimeLoans - Number of loans repaid on time
 * @param lateLoans - Number of loans repaid late
 * @returns Repayment score (0-700 points)
 */
export function calculateRepaymentScore(
  totalLoans: bigint,
  onTimeLoans: bigint,
  lateLoans: bigint
): number {
  const total = Number(totalLoans);
  const onTime = Number(onTimeLoans);
  const late = Number(lateLoans);

  // No loans = 0 points
  if (total === 0) return 0;

  // New borrower boost: divide by (total + 5) for first few loans
  if (total < 5) {
    return Math.floor((onTime * 700) / (total + 5));
  }

  // Established borrowers: standard calculation
  return Math.floor((onTime * 700) / total);
}

/**
 * Calculate total credit score
 * @param activityScore - Activity score (0-300)
 * @param repaymentScore - Repayment score (0-700)
 * @returns Total credit score (0-1000)
 */
export function calculateTotalScore(activityScore: number, repaymentScore: number): number {
  return activityScore + repaymentScore;
}

/**
 * Determine tier based on credit score
 * Matches contract logic from loan-limit function
 * @param creditScore - Total credit score (0-1000)
 * @returns Tier number (0-5)
 */
export function getTierFromScore(creditScore: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (creditScore <= TIER_THRESHOLDS[1]) return 0;
  if (creditScore <= TIER_THRESHOLDS[2]) return 1;
  if (creditScore <= TIER_THRESHOLDS[3]) return 2;
  if (creditScore <= TIER_THRESHOLDS[4]) return 3;
  if (creditScore <= TIER_THRESHOLDS[5]) return 4;
  return 5; // 901+
}

/**
 * Get loan limit for a tier
 * @param tier - Tier number (0-5)
 * @returns Loan limit in satoshis
 */
export function getTierLimit(tier: 0 | 1 | 2 | 3 | 4 | 5): number {
  return TIER_LIMITS[tier];
}

/**
 * Get next tier information
 * @param currentScore - Current credit score
 * @returns Next tier info or null if already at max tier
 */
export function getNextTierInfo(currentScore: number): {
  tier: number;
  name: string;
  threshold: number;
  pointsNeeded: number;
  loanLimit: number;
} | null {
  const currentTier = getTierFromScore(currentScore);
  
  if (currentTier === 5) return null; // Already at max tier

  const nextTier = (currentTier + 1) as 0 | 1 | 2 | 3 | 4 | 5;
  const nextThreshold = TIER_THRESHOLDS[nextTier];
  
  return {
    tier: nextTier,
    name: TIER_INFO[nextTier].name,
    threshold: nextThreshold,
    pointsNeeded: Math.max(0, nextThreshold - currentScore + 1),
    loanLimit: TIER_LIMITS[nextTier],
  };
}

/**
 * Get color for credit score gauge
 * @param creditScore - Total credit score
 * @returns Color hex code
 */
export function getScoreColor(creditScore: number): string {
  const tier = getTierFromScore(creditScore);
  return TIER_INFO[tier].color;
}

/**
 * Format score progress percentage
 * @param currentScore - Current score
 * @param maxScore - Maximum possible score (1000)
 * @returns Percentage (0-100)
 */
export function getScorePercentage(currentScore: number, maxScore: number = 1000): number {
  return Math.min(100, Math.max(0, (currentScore / maxScore) * 100));
}

/**
 * Get tier progress percentage (progress to next tier)
 * @param currentScore - Current credit score
 * @returns Percentage (0-100)
 */
export function getTierProgress(currentScore: number): number {
  const currentTier = getTierFromScore(currentScore);
  
  if (currentTier === 5) return 100; // Max tier
  
  const currentThreshold = TIER_THRESHOLDS[currentTier];
  const nextThreshold = TIER_THRESHOLDS[(currentTier + 1) as 1 | 2 | 3 | 4 | 5];
  
  const progress = ((currentScore - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return Math.min(100, Math.max(0, progress));
}
