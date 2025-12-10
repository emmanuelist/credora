/**
 * APY Calculation Service
 * Calculates dynamic APY based on pool utilization
 */

export interface APYData {
  currentAPY: number;
  baseAPY: number;
  utilizationBonus: number;
  utilizationRate: number;
}

// Configuration
const BASE_APY = 5; // 5% base APY
const MAX_UTILIZATION_BONUS = 15; // Up to 15% bonus at 100% utilization
const TARGET_UTILIZATION = 80; // Optimal utilization target (80%)

/**
 * Calculate dynamic APY based on pool utilization
 * Formula: APY = Base APY + (Utilization Rate × Max Bonus)
 * 
 * Examples:
 * - 0% utilization: 5% APY
 * - 50% utilization: 12.5% APY
 * - 80% utilization: 17% APY (optimal)
 * - 100% utilization: 20% APY
 * 
 * @param totalPoolBalance - Total sBTC in the pool
 * @param totalBorrowed - Total sBTC currently borrowed
 * @returns APY data with breakdown
 */
export function calculateAPY(
  totalPoolBalance: bigint,
  totalBorrowed: bigint
): APYData {
  // Handle null/undefined values
  if (!totalPoolBalance || !totalBorrowed) {
    return {
      currentAPY: BASE_APY,
      baseAPY: BASE_APY,
      utilizationBonus: 0,
      utilizationRate: 0,
    };
  }

  // Convert to BigInt if needed (in case numbers are passed)
  const poolBalanceBigInt = typeof totalPoolBalance === 'bigint' ? totalPoolBalance : BigInt(totalPoolBalance);
  const borrowedBigInt = typeof totalBorrowed === 'bigint' ? totalBorrowed : BigInt(totalBorrowed);

  // Handle edge case: empty pool
  if (poolBalanceBigInt === BigInt(0)) {
    return {
      currentAPY: BASE_APY,
      baseAPY: BASE_APY,
      utilizationBonus: 0,
      utilizationRate: 0,
    };
  }

  // Calculate utilization rate (0-100)
  const utilizationRate = Number(
    (borrowedBigInt * BigInt(10000)) / poolBalanceBigInt
  ) / 100;

  // Calculate utilization bonus (scales linearly with utilization)
  const utilizationBonus = (utilizationRate / 100) * MAX_UTILIZATION_BONUS;

  // Calculate final APY
  const currentAPY = BASE_APY + utilizationBonus;

  return {
    currentAPY: Math.round(currentAPY * 100) / 100, // Round to 2 decimals
    baseAPY: BASE_APY,
    utilizationBonus: Math.round(utilizationBonus * 100) / 100,
    utilizationRate: Math.round(utilizationRate * 100) / 100,
  };
}

/**
 * Calculate projected earnings based on deposit amount and time
 * 
 * @param depositAmount - Amount to deposit (in satoshis)
 * @param apy - Current APY percentage
 * @param daysHeld - Number of days to hold the deposit
 * @returns Projected earnings in satoshis
 */
export function calculateProjectedEarnings(
  depositAmount: bigint,
  apy: number,
  daysHeld: number
): bigint {
  // Convert APY to daily rate
  const dailyRate = apy / 365 / 100;
  
  // Calculate compound interest
  const multiplier = Math.pow(1 + dailyRate, daysHeld);
  
  // Calculate earnings
  const totalAmount = Number(depositAmount) * multiplier;
  const earnings = totalAmount - Number(depositAmount);
  
  return BigInt(Math.floor(earnings));
}

/**
 * Format APY for display
 */
export function formatAPY(apy: number): string {
  return `${apy.toFixed(2)}%`;
}

/**
 * Get APY color based on rate (for UI theming)
 */
export function getAPYColor(apy: number): string {
  if (apy >= 15) return 'text-green-500';
  if (apy >= 10) return 'text-blue-500';
  return 'text-gray-500';
}

/**
 * Get utilization status message
 */
export function getUtilizationStatus(utilizationRate: number): {
  status: 'low' | 'optimal' | 'high' | 'critical';
  message: string;
  color: string;
} {
  if (utilizationRate < 40) {
    return {
      status: 'low',
      message: 'Low utilization - great time to borrow!',
      color: 'text-blue-500',
    };
  }
  
  if (utilizationRate < 75) {
    return {
      status: 'optimal',
      message: 'Optimal utilization - healthy pool balance',
      color: 'text-green-500',
    };
  }
  
  if (utilizationRate < 90) {
    return {
      status: 'high',
      message: 'High utilization - consider lending to earn more',
      color: 'text-yellow-500',
    };
  }
  
  return {
    status: 'critical',
    message: 'Critical utilization - limited liquidity available',
    color: 'text-red-500',
  };
}
