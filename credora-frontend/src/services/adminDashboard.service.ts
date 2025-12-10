/**
 * Admin Dashboard Service
 * 
 * Fetches and calculates platform-wide metrics:
 * - Total Value Locked (TVL)
 * - Active loans and borrowers
 * - Default rate and risk metrics
 * - Pool utilization statistics
 * - User activity metrics
 */

import { CREDORA_CONTRACT } from '@/lib/contracts/credora';

const CREDORA_CONTRACT_ADDRESS = CREDORA_CONTRACT.address;
const CREDORA_CONTRACT_NAME = CREDORA_CONTRACT.name;
const STACKS_API_URL = 'https://api.testnet.hiro.so';

export interface PlatformMetrics {
  tvl: {
    totalValueLocked: bigint;
    totalDeposits: bigint;
    totalBorrowed: bigint;
    availableLiquidity: bigint;
    utilizationRate: number;
  };
  loans: {
    totalActiveLoans: number;
    totalLoansIssued: number;
    totalRepaid: number;
    defaultedLoans: number;
    defaultRate: number;
    averageLoanSize: bigint;
  };
  users: {
    totalLenders: number;
    totalBorrowers: number;
    activeUsers: number;
    newUsersLast30Days: number;
  };
  performance: {
    totalInterestEarned: bigint;
    platformRevenue: bigint;
    averageAPY: number;
    poolHealth: 'healthy' | 'moderate' | 'stressed' | 'critical';
  };
}

export interface UserActivity {
  address: string;
  totalDeposited: bigint;
  totalBorrowed: bigint;
  creditScore: number;
  loanCount: number;
  onTimePayments: number;
  latePayments: number;
  lastActivity: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PoolStatistics {
  timestamp: number;
  totalPool: bigint;
  totalBorrowed: bigint;
  utilizationRate: number;
  apy: number;
  activeLoans: number;
}

/**
 * Fetch contract events to reconstruct platform state
 */
async function fetchContractEvents(limit: number = 200): Promise<any[]> {
  try {
    const contractId = `${CREDORA_CONTRACT_ADDRESS}.${CREDORA_CONTRACT_NAME}`;
    const url = `${STACKS_API_URL}/extended/v2/smart-contracts/${contractId}/events?limit=${limit}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch contract events: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching contract events:', error);
    return [];
  }
}

/**
 * Fetch all transactions to the contract from recent blocks
 */
async function fetchAllTransactions(limit: number = 50): Promise<any[]> {
  try {
    const contractId = `${CREDORA_CONTRACT_ADDRESS}.${CREDORA_CONTRACT_NAME}`;
    
    // Fetch recent transactions from the blockchain
    const url = `${STACKS_API_URL}/extended/v1/tx?limit=${limit}&type=contract_call`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      throw new Error(`Failed to fetch transactions: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Filter for our specific contract
    return data.results.filter((tx: any) => 
      tx.tx_type === 'contract_call' && 
      tx.contract_call?.contract_id === contractId &&
      tx.tx_status === 'success'
    );
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

/**
 * Parse transaction amount from function args
 */
function extractAmount(tx: any): bigint {
  if (!tx.contract_call?.function_args) return 0n;
  
  const amountArg = tx.contract_call.function_args.find(
    (arg: any) => arg.name === 'amount' || arg.type === 'uint'
  );
  
  if (amountArg) {
    const match = amountArg.repr.match(/u(\d+)/);
    if (match) {
      return BigInt(match[1]);
    }
  }
  
  return 0n;
}

/**
 * Fetch pool info directly from contract
 */
async function fetchPoolInfo(): Promise<any> {
  try {
    const { callCredoraReadOnly } = await import('@/lib/contracts/credora');
    const poolInfo = await callCredoraReadOnly('get-lending-pool-info');
    console.log('📊 Raw pool info from contract:', poolInfo);
    
    // The response might be nested in value
    const data = poolInfo?.value || poolInfo;
    console.log('📊 Parsed pool info:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching pool info:', error);
    return null;
  }
}

/**
 * Calculate platform-wide metrics from contract state
 */
export async function calculatePlatformMetrics(): Promise<PlatformMetrics> {
  // Fetch pool info from contract
  const poolInfo = await fetchPoolInfo();
  const transactions = await fetchAllTransactions();
  
  // If we have pool info from contract, use it as base
  let totalDeposits = 0n;
  let totalWithdrawals = 0n;
  let totalBorrowed = 0n;
  let totalRepaid = 0n;
  
  if (poolInfo) {
    console.log('📊 Processing pool info:', poolInfo);
    // Pool info structure from contract: {pool_size, contract_balance, lock_duration_in_days}
    // Each value is an object with {type, value} from Clarity
    const poolSizeObj = poolInfo['pool_size'] || poolInfo.pool_size || poolInfo.poolSize;
    const contractBalanceObj = poolInfo['contract_balance'] || poolInfo.contract_balance || poolInfo.contractBalance;
    
    const poolSize = BigInt(poolSizeObj?.value || poolSizeObj || 0);
    const contractBalance = BigInt(contractBalanceObj?.value || contractBalanceObj || 0);
    
    console.log('💰 Pool size:', poolSize.toString(), 'sats');
    console.log('💰 Contract balance:', contractBalance.toString(), 'sats');
    
    totalDeposits = poolSize; // Total deposits in the pool
    totalBorrowed = poolSize - contractBalance; // Borrowed = deposited - available
  }
  
  let totalLoansIssued = 0;
  let totalRepaidCount = 0;
  let defaultedLoans = 0;
  
  const uniqueLenders = new Set<string>();
  const uniqueBorrowers = new Set<string>();
  const recentUsers = new Set<string>();
  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  
  // Process transactions
  for (const tx of transactions) {
    if (tx.tx_status !== 'success') continue;
    
    const functionName = tx.contract_call?.function_name || '';
    const sender = tx.sender_address;
    const amount = extractAmount(tx);
    const timestamp = tx.burn_block_time * 1000;
    
    switch (functionName) {
      case 'deposit-funds':
      case 'deposit':
        totalDeposits += amount;
        uniqueLenders.add(sender);
        if (timestamp > thirtyDaysAgo) recentUsers.add(sender);
        break;
        
      case 'withdraw-funds':
      case 'withdraw':
        totalWithdrawals += amount;
        if (timestamp > thirtyDaysAgo) recentUsers.add(sender);
        break;
        
      case 'apply-for-loan':
      case 'borrow':
        totalBorrowed += amount;
        totalLoansIssued++;
        uniqueBorrowers.add(sender);
        if (timestamp > thirtyDaysAgo) recentUsers.add(sender);
        break;
        
      case 'repay-loan':
      case 'repay':
        totalRepaid += amount;
        totalRepaidCount++;
        if (timestamp > thirtyDaysAgo) recentUsers.add(sender);
        break;
    }
  }
  
  // Calculate derived metrics
  const currentTVL = totalDeposits - totalWithdrawals;
  const currentBorrowed = totalBorrowed - totalRepaid;
  const availableLiquidity = currentTVL - currentBorrowed;
  const utilizationRate = currentTVL > 0n 
    ? Number((currentBorrowed * 100n) / currentTVL) 
    : 0;
  
  const defaultedLoansEstimate = Math.max(0, totalLoansIssued - totalRepaidCount);
  const defaultRate = totalLoansIssued > 0 
    ? (defaultedLoansEstimate / totalLoansIssued) * 100 
    : 0;
  
  const averageLoanSize = totalLoansIssued > 0 
    ? totalBorrowed / BigInt(totalLoansIssued) 
    : 0n;
  
  // Calculate interest earned (simplified: 10% of all repayments)
  const totalInterestEarned = totalRepaid / 10n; // Approximate
  const platformRevenue = totalInterestEarned / 20n; // Platform fee (5%)
  
  // Calculate average APY based on utilization
  const baseAPY = 5;
  const maxBonus = 15;
  const averageAPY = baseAPY + (utilizationRate / 100) * maxBonus;
  
  // Determine pool health
  let poolHealth: 'healthy' | 'moderate' | 'stressed' | 'critical' = 'healthy';
  if (utilizationRate > 95) poolHealth = 'critical';
  else if (utilizationRate > 85) poolHealth = 'stressed';
  else if (utilizationRate > 70) poolHealth = 'moderate';
  
  return {
    tvl: {
      totalValueLocked: currentTVL,
      totalDeposits,
      totalBorrowed: currentBorrowed,
      availableLiquidity,
      utilizationRate,
    },
    loans: {
      totalActiveLoans: totalLoansIssued - totalRepaidCount,
      totalLoansIssued,
      totalRepaid: totalRepaidCount,
      defaultedLoans: defaultedLoansEstimate,
      defaultRate,
      averageLoanSize,
    },
    users: {
      totalLenders: uniqueLenders.size,
      totalBorrowers: uniqueBorrowers.size,
      activeUsers: uniqueLenders.size + uniqueBorrowers.size,
      newUsersLast30Days: recentUsers.size,
    },
    performance: {
      totalInterestEarned,
      platformRevenue,
      averageAPY,
      poolHealth,
    },
  };
}

/**
 * Get historical pool statistics (last 30 days)
 */
export async function getPoolStatisticsHistory(): Promise<PoolStatistics[]> {
  // This would ideally fetch historical snapshots
  // For now, we'll return current state as a single data point
  const metrics = await calculatePlatformMetrics();
  
  return [{
    timestamp: Date.now(),
    totalPool: metrics.tvl.totalValueLocked,
    totalBorrowed: metrics.tvl.totalBorrowed,
    utilizationRate: metrics.tvl.utilizationRate,
    apy: metrics.performance.averageAPY,
    activeLoans: metrics.loans.totalActiveLoans,
  }];
}

/**
 * Get top users by activity
 */
export async function getTopUsers(limit: number = 10): Promise<UserActivity[]> {
  const transactions = await fetchAllTransactions();
  
  // Aggregate user activity
  const userMap = new Map<string, {
    deposits: bigint;
    borrowed: bigint;
    loanCount: number;
    repayments: number;
    lastActivity: number;
  }>();
  
  for (const tx of transactions) {
    if (tx.tx_status !== 'success') continue;
    
    const sender = tx.sender_address;
    const functionName = tx.contract_call?.function_name || '';
    const amount = extractAmount(tx);
    const timestamp = tx.burn_block_time * 1000;
    
    if (!userMap.has(sender)) {
      userMap.set(sender, {
        deposits: 0n,
        borrowed: 0n,
        loanCount: 0,
        repayments: 0,
        lastActivity: 0,
      });
    }
    
    const userData = userMap.get(sender)!;
    userData.lastActivity = Math.max(userData.lastActivity, timestamp);
    
    switch (functionName) {
      case 'deposit-funds':
      case 'deposit':
        userData.deposits += amount;
        break;
      case 'apply-for-loan':
      case 'borrow':
        userData.borrowed += amount;
        userData.loanCount++;
        break;
      case 'repay-loan':
      case 'repay':
        userData.repayments++;
        break;
    }
  }
  
  // Convert to UserActivity array
  const users: UserActivity[] = Array.from(userMap.entries()).map(([address, data]) => {
    const latePayments = Math.max(0, data.loanCount - data.repayments);
    const onTimePayments = data.repayments;
    
    // Simple credit score estimation
    const activityScore = Math.min(300, Number(data.deposits) / 1000000);
    const repaymentScore = data.loanCount > 0 
      ? Math.floor((onTimePayments / data.loanCount) * 700) 
      : 0;
    const creditScore = activityScore + repaymentScore;
    
    // Risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (latePayments > 2) riskLevel = 'high';
    else if (latePayments > 0) riskLevel = 'medium';
    
    return {
      address,
      totalDeposited: data.deposits,
      totalBorrowed: data.borrowed,
      creditScore,
      loanCount: data.loanCount,
      onTimePayments,
      latePayments,
      lastActivity: data.lastActivity,
      riskLevel,
    };
  });
  
  // Sort by total activity (deposits + borrowed) and return top N
  return users
    .sort((a, b) => Number((b.totalDeposited + b.totalBorrowed) - (a.totalDeposited + a.totalBorrowed)))
    .slice(0, limit);
}

/**
 * Format BTC amount for display
 */
export function formatBTC(satoshis: bigint): string {
  return (Number(satoshis) / 100000000).toFixed(8);
}

/**
 * Format USD amount for display
 */
export function formatUSD(satoshis: bigint, btcPrice: number): string {
  const btc = Number(satoshis) / 100000000;
  return (btc * btcPrice).toFixed(2);
}

/**
 * Get health status color
 */
export function getHealthColor(health: string): string {
  const colors = {
    healthy: 'text-green-600 bg-green-100',
    moderate: 'text-yellow-600 bg-yellow-100',
    stressed: 'text-orange-600 bg-orange-100',
    critical: 'text-red-600 bg-red-100',
  };
  return colors[health as keyof typeof colors] || colors.healthy;
}

/**
 * Cache key for metrics
 */
const METRICS_CACHE_KEY = 'admin-metrics-cache';

/**
 * Cache metrics in localStorage
 */
export function cacheMetrics(metrics: PlatformMetrics): void {
  try {
    // Convert BigInt to string for JSON serialization
    const serializableMetrics = {
      tvl: {
        totalValueLocked: metrics.tvl.totalValueLocked.toString(),
        totalDeposits: metrics.tvl.totalDeposits.toString(),
        totalBorrowed: metrics.tvl.totalBorrowed.toString(),
        availableLiquidity: metrics.tvl.availableLiquidity.toString(),
        utilizationRate: metrics.tvl.utilizationRate,
      },
      loans: {
        ...metrics.loans,
        averageLoanSize: metrics.loans.averageLoanSize.toString(),
      },
      users: metrics.users,
      performance: {
        totalInterestEarned: metrics.performance.totalInterestEarned.toString(),
        platformRevenue: metrics.performance.platformRevenue.toString(),
        averageAPY: metrics.performance.averageAPY,
        poolHealth: metrics.performance.poolHealth,
      },
    };
    
    localStorage.setItem(
      METRICS_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        metrics: serializableMetrics,
      })
    );
  } catch (error) {
    console.error('Failed to cache metrics:', error);
  }
}

/**
 * Get cached metrics
 */
export function getCachedMetrics(): PlatformMetrics | null {
  try {
    const cached = localStorage.getItem(METRICS_CACHE_KEY);
    if (!cached) return null;
    
    const { timestamp, metrics } = JSON.parse(cached);
    
    // Cache expires after 2 minutes
    if (Date.now() - timestamp > 2 * 60 * 1000) {
      localStorage.removeItem(METRICS_CACHE_KEY);
      return null;
    }
    
    // Reconstruct BigInt values
    return {
      ...metrics,
      tvl: {
        ...metrics.tvl,
        totalValueLocked: BigInt(metrics.tvl.totalValueLocked),
        totalDeposits: BigInt(metrics.tvl.totalDeposits),
        totalBorrowed: BigInt(metrics.tvl.totalBorrowed),
        availableLiquidity: BigInt(metrics.tvl.availableLiquidity),
      },
      loans: {
        ...metrics.loans,
        averageLoanSize: BigInt(metrics.loans.averageLoanSize),
      },
      performance: {
        ...metrics.performance,
        totalInterestEarned: BigInt(metrics.performance.totalInterestEarned),
        platformRevenue: BigInt(metrics.performance.platformRevenue),
      },
    };
  } catch (error) {
    console.error('Failed to get cached metrics:', error);
    return null;
  }
}
