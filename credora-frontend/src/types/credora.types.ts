export type CreditTier = 'entry' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface CreditScore {
  total: number;
  activityScore: number;
  repaymentScore: number;
  tier: CreditTier;
  // Account data for detailed breakdown
  totalLoans?: bigint;
  onTimeLoans?: bigint;
  lateLoans?: bigint;
  averageBalance?: bigint;
}

export interface LoanInfo {
  amount: bigint;
  dueBlock: number;
  interestRate: number;
  issuedBlock: number;
  repaymentAmount: bigint;
  isOverdue: boolean;
  daysRemaining: number;
}

export interface LenderInfo {
  balance: bigint;
  poolBalance: bigint;
  lockedBlock: number;
  unlockBlock: number;
  earnings: bigint;
  isLocked: boolean;
}

export interface PoolInfo {
  totalPool: bigint;
  contractBalance: bigint;
  currentAPY: number;
  lockDuration: number;
  utilizationRate: number;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'borrow' | 'repay';
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  txHash?: string;
}

export const TIER_CONFIG = {
  entry: { min: 0, max: 300, color: 'tier-entry', label: 'Entry' },
  bronze: { min: 301, max: 450, color: 'tier-bronze', label: 'Bronze' },
  silver: { min: 451, max: 600, color: 'tier-silver', label: 'Silver' },
  gold: { min: 601, max: 750, color: 'tier-gold', label: 'Gold' },
  platinum: { min: 751, max: 900, color: 'tier-platinum', label: 'Platinum' },
  diamond: { min: 901, max: 1000, color: 'tier-diamond', label: 'Diamond' },
} as const;

export function getCreditTier(score: number): CreditTier {
  if (score <= 300) return 'entry';
  if (score <= 450) return 'bronze';
  if (score <= 600) return 'silver';
  if (score <= 750) return 'gold';
  if (score <= 900) return 'platinum';
  return 'diamond';
}
