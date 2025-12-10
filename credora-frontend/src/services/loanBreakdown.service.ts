/**
 * Loan Breakdown Service
 * Calculates detailed repayment amounts including interest and penalties
 */

export interface LoanBreakdown {
  principal: bigint;
  interest: bigint;
  penalty: bigint;
  totalDue: bigint;
  dueDate: number;
  daysRemaining: number;
  isOverdue: boolean;
  interestRate: number;
  penaltyRate: number;
}

// Constants from contract
const INTEREST_RATE = 10; // 10% annual interest
const PENALTY_RATE = 5; // 5% penalty for late payment
const BLOCKS_PER_DAY = 144; // Approximate blocks per day on Stacks

/**
 * Calculate detailed loan breakdown
 * 
 * @param principal - Original loan amount in satoshis
 * @param borrowBlock - Block when loan was taken
 * @param dueBlock - Block when loan is due
 * @param currentBlock - Current block height
 * @returns Detailed breakdown of amounts due
 */
export function calculateLoanBreakdown(
  principal: bigint,
  borrowBlock: number,
  dueBlock: number,
  currentBlock: number
): LoanBreakdown {
  // Calculate time periods
  const totalBlocks = dueBlock - borrowBlock;
  const elapsedBlocks = currentBlock - borrowBlock;
  const remainingBlocks = dueBlock - currentBlock;
  const isOverdue = currentBlock > dueBlock;
  
  // Calculate days
  const totalDays = Math.floor(totalBlocks / BLOCKS_PER_DAY);
  const daysRemaining = Math.max(0, Math.floor(remainingBlocks / BLOCKS_PER_DAY));
  
  // Calculate interest (10% annual rate, prorated)
  // Formula: principal × (rate / 365) × days
  const interestAmount = calculateInterest(principal, INTEREST_RATE, totalDays);
  
  // Calculate penalty if overdue (5% of principal)
  let penaltyAmount = BigInt(0);
  if (isOverdue) {
    const overdueBlocks = currentBlock - dueBlock;
    const overdueDays = Math.floor(overdueBlocks / BLOCKS_PER_DAY);
    // Penalty is 5% of principal
    penaltyAmount = (principal * BigInt(PENALTY_RATE)) / BigInt(100);
  }
  
  // Calculate total due
  const totalDue = principal + interestAmount + penaltyAmount;
  
  return {
    principal,
    interest: interestAmount,
    penalty: penaltyAmount,
    totalDue,
    dueDate: dueBlock,
    daysRemaining,
    isOverdue,
    interestRate: INTEREST_RATE,
    penaltyRate: PENALTY_RATE,
  };
}

/**
 * Calculate interest amount
 * 
 * @param principal - Loan amount
 * @param annualRate - Annual interest rate percentage
 * @param days - Number of days
 * @returns Interest amount in satoshis
 */
export function calculateInterest(
  principal: bigint,
  annualRate: number,
  days: number
): bigint {
  // Calculate daily rate
  const dailyRate = annualRate / 365 / 100;
  
  // Calculate interest
  const interestMultiplier = dailyRate * days;
  const interestAmount = Number(principal) * interestMultiplier;
  
  return BigInt(Math.floor(interestAmount));
}

/**
 * Calculate time remaining display string
 */
export function formatTimeRemaining(daysRemaining: number, isOverdue: boolean): string {
  if (isOverdue) {
    return 'Overdue';
  }
  
  if (daysRemaining === 0) {
    return 'Due today';
  }
  
  if (daysRemaining === 1) {
    return '1 day remaining';
  }
  
  return `${daysRemaining} days remaining`;
}

/**
 * Calculate repayment progress percentage
 */
export function calculateRepaymentProgress(
  borrowBlock: number,
  dueBlock: number,
  currentBlock: number
): number {
  const totalBlocks = dueBlock - borrowBlock;
  const elapsedBlocks = Math.min(currentBlock - borrowBlock, totalBlocks);
  
  if (totalBlocks === 0) return 0;
  
  const progress = (elapsedBlocks / totalBlocks) * 100;
  return Math.min(100, Math.max(0, progress));
}

/**
 * Get urgency level based on time remaining
 */
export function getUrgencyLevel(daysRemaining: number, isOverdue: boolean): {
  level: 'low' | 'medium' | 'high' | 'critical';
  color: string;
  message: string;
} {
  if (isOverdue) {
    return {
      level: 'critical',
      color: 'text-red-500',
      message: 'Payment overdue - 5% penalty applied',
    };
  }
  
  if (daysRemaining <= 3) {
    return {
      level: 'high',
      color: 'text-orange-500',
      message: 'Payment due soon',
    };
  }
  
  if (daysRemaining <= 7) {
    return {
      level: 'medium',
      color: 'text-yellow-500',
      message: 'Plan your repayment',
    };
  }
  
  return {
    level: 'low',
    color: 'text-green-500',
    message: 'On track',
  };
}

/**
 * Format breakdown for display
 */
export function formatBreakdown(breakdown: LoanBreakdown) {
  return {
    principal: breakdown.principal,
    interest: breakdown.interest,
    penalty: breakdown.penalty,
    total: breakdown.totalDue,
    timeRemaining: formatTimeRemaining(breakdown.daysRemaining, breakdown.isOverdue),
    urgency: getUrgencyLevel(breakdown.daysRemaining, breakdown.isOverdue),
    progress: calculateRepaymentProgress(
      breakdown.dueDate - (breakdown.daysRemaining * BLOCKS_PER_DAY),
      breakdown.dueDate,
      breakdown.dueDate - (breakdown.daysRemaining * BLOCKS_PER_DAY) + 
        (breakdown.daysRemaining > 0 ? (30 - breakdown.daysRemaining) * BLOCKS_PER_DAY : 0)
    ),
  };
}
