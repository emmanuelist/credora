/**
 * Credit Score History Reconstruction Service
 * 
 * Reconstructs historical credit scores by analyzing blockchain events chronologically.
 * Calculates score evolution over time based on deposits, loans, and repayments.
 */

import { CREDORA_CONTRACT } from '@/lib/contracts/credora';
import {
  calculateActivityScore,
  calculateRepaymentScore,
  type LoanHistory,
} from './creditScoreSimulator.service';

const CREDORA_CONTRACT_ADDRESS = CREDORA_CONTRACT.address;
const CREDORA_CONTRACT_NAME = CREDORA_CONTRACT.name;

export interface CreditScoreSnapshot {
  blockHeight: number;
  timestamp: number;
  totalScore: number;
  activityScore: number;
  repaymentScore: number;
  tier: number;
  tierName: string;
  event: 'deposit' | 'borrow' | 'repay_ontime' | 'repay_late' | 'initial';
  eventDetails: string;
  loanHistory: LoanHistory;
  averageBalance: number;
}

interface ContractEvent {
  event_index: number;
  event_type: string;
  tx_id: string;
  contract_log?: {
    contract_id: string;
    topic: string;
    value: {
      hex: string;
      repr: string;
    };
  };
}

interface StacksTransaction {
  tx_id: string;
  tx_status: string;
  tx_type: string;
  block_height: number;
  burn_block_time: number;
  burn_block_time_iso: string;
  sender_address: string;
  contract_call?: {
    contract_id: string;
    function_name: string;
    function_args: Array<{
      hex: string;
      repr: string;
      name: string;
      type: string;
    }>;
  };
  tx_result?: {
    hex: string;
    repr: string;
  };
}

/**
 * Fetch all transactions for an address and parse them chronologically
 */
async function fetchUserTransactions(address: string): Promise<StacksTransaction[]> {
  try {
    const apiUrl = `https://api.testnet.hiro.so/extended/v1/address/${address}/transactions?limit=50`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.statusText}`);
    }

    const data = await response.json();
    const transactions: StacksTransaction[] = [];

    for (const tx of data.results as StacksTransaction[]) {
      // Only process successful contract calls to our Credora contract
      if (
        tx.tx_type === 'contract_call' &&
        tx.tx_status === 'success' &&
        tx.contract_call &&
        (tx.contract_call.contract_id.includes(CREDORA_CONTRACT_NAME) ||
          tx.contract_call.contract_id.includes(CREDORA_CONTRACT_ADDRESS))
      ) {
        transactions.push(tx);
      }
    }

    // Sort by block height (oldest first) for chronological reconstruction
    return transactions.sort((a, b) => a.block_height - b.block_height);
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    return [];
  }
}

/**
 * Extract amount from function arguments
 */
function extractAmount(tx: StacksTransaction): number {
  if (!tx.contract_call?.function_args) return 0;
  
  const amountArg = tx.contract_call.function_args.find(
    arg => arg.name === 'amount' || arg.type === 'uint'
  );
  
  if (amountArg) {
    // Parse the repr string, e.g., "u100000" -> 100000
    const match = amountArg.repr.match(/u(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  return 0;
}

/**
 * Determine if a loan repayment was on-time or late
 * This is a simplified heuristic - in production, you'd check the due block
 */
function wasRepaymentOnTime(
  borrowBlock: number,
  repayBlock: number,
  loanDurationBlocks: number = 2016 // 14 days default
): boolean {
  const dueBlock = borrowBlock + loanDurationBlocks;
  return repayBlock <= dueBlock;
}

/**
 * Estimate average balance at a given point in time
 * Simplified calculation based on deposits up to that point
 */
function estimateAverageBalance(
  deposits: Array<{ block: number; amount: number }>,
  currentBlock: number
): number {
  const relevantDeposits = deposits.filter(d => d.block <= currentBlock);
  if (relevantDeposits.length === 0) return 0;
  
  // Simple average of all deposits (in production, use 3-month rolling average)
  const totalDeposited = relevantDeposits.reduce((sum, d) => sum + d.amount, 0);
  return Math.floor(totalDeposited / relevantDeposits.length);
}

/**
 * Map tier name from tier number
 */
function getTierName(score: number): string {
  if (score > 900) return 'Diamond';
  if (score > 750) return 'Platinum';
  if (score > 600) return 'Gold';
  if (score > 450) return 'Silver';
  if (score > 300) return 'Bronze';
  return 'Entry';
}

/**
 * Map tier number from score
 */
function getTierNumber(score: number): number {
  if (score > 900) return 5;
  if (score > 750) return 4;
  if (score > 600) return 3;
  if (score > 450) return 2;
  if (score > 300) return 1;
  return 0;
}

/**
 * Reconstruct credit score history from blockchain transactions
 */
export async function reconstructCreditScoreHistory(
  address: string
): Promise<CreditScoreSnapshot[]> {
  const transactions = await fetchUserTransactions(address);
  const history: CreditScoreSnapshot[] = [];
  
  // Track state throughout history
  let loanHistory: LoanHistory = {
    totalLoans: 0,
    onTimeLoans: 0,
    lateLoans: 0,
  };
  
  const deposits: Array<{ block: number; amount: number }> = [];
  const activeLoan: { borrowBlock: number; amount: number } | null = null;
  const loans: Array<{ borrowBlock: number; repayBlock: number; amount: number }> = [];
  
  // Initial snapshot (before any transactions)
  if (transactions.length > 0) {
    history.push({
      blockHeight: transactions[0].block_height - 1,
      timestamp: transactions[0].burn_block_time - 600, // ~10 min before
      totalScore: 0,
      activityScore: 0,
      repaymentScore: 0,
      tier: 0,
      tierName: 'Entry',
      event: 'initial',
      eventDetails: 'Account created',
      loanHistory: { ...loanHistory },
      averageBalance: 0,
    });
  }
  
  // Process each transaction chronologically
  for (const tx of transactions) {
    const functionName = tx.contract_call?.function_name || '';
    const amount = extractAmount(tx);
    
    let eventType: CreditScoreSnapshot['event'] = 'initial';
    let eventDetails = '';
    
    // Handle different transaction types
    if (functionName === 'deposit-funds' || functionName === 'deposit') {
      deposits.push({ block: tx.block_height, amount });
      eventType = 'deposit';
      eventDetails = `Deposited ${(amount / 100000000).toFixed(8)} BTC`;
    } else if (functionName === 'apply-for-loan' || functionName === 'borrow') {
      loanHistory.totalLoans++;
      eventType = 'borrow';
      eventDetails = `Borrowed ${(amount / 100000000).toFixed(8)} BTC`;
    } else if (functionName === 'repay-loan' || functionName === 'repay') {
      // Determine if repayment was on-time or late
      // (This is simplified - in production, track each loan's borrow block)
      const isOnTime = true; // Default assumption
      
      if (isOnTime) {
        loanHistory.onTimeLoans++;
        eventType = 'repay_ontime';
        eventDetails = `Repaid loan on-time`;
      } else {
        loanHistory.lateLoans++;
        eventType = 'repay_late';
        eventDetails = `Repaid loan late`;
      }
    }
    
    // Calculate scores at this point in time
    const averageBalance = estimateAverageBalance(deposits, tx.block_height);
    const activityScore = calculateActivityScore(averageBalance);
    const repaymentScore = calculateRepaymentScore(loanHistory);
    const totalScore = activityScore + repaymentScore;
    const tier = getTierNumber(totalScore);
    const tierName = getTierName(totalScore);
    
    // Add snapshot
    history.push({
      blockHeight: tx.block_height,
      timestamp: tx.burn_block_time,
      totalScore,
      activityScore,
      repaymentScore,
      tier,
      tierName,
      event: eventType,
      eventDetails,
      loanHistory: { ...loanHistory },
      averageBalance,
    });
  }
  
  return history;
}

/**
 * Get credit score statistics from history
 */
export function getCreditScoreStatistics(history: CreditScoreSnapshot[]): {
  highestScore: number;
  lowestScore: number;
  averageScore: number;
  currentScore: number;
  scoreImprovement: number;
  totalEvents: number;
  positiveEvents: number;
  negativeEvents: number;
} {
  if (history.length === 0) {
    return {
      highestScore: 0,
      lowestScore: 0,
      averageScore: 0,
      currentScore: 0,
      scoreImprovement: 0,
      totalEvents: 0,
      positiveEvents: 0,
      negativeEvents: 0,
    };
  }
  
  const scores = history.map(h => h.totalScore);
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);
  const averageScore = Math.floor(scores.reduce((a, b) => a + b, 0) / scores.length);
  const currentScore = history[history.length - 1].totalScore;
  const initialScore = history[0].totalScore;
  const scoreImprovement = currentScore - initialScore;
  
  const positiveEvents = history.filter(
    h => h.event === 'deposit' || h.event === 'repay_ontime'
  ).length;
  const negativeEvents = history.filter(
    h => h.event === 'repay_late'
  ).length;
  
  return {
    highestScore,
    lowestScore,
    averageScore,
    currentScore,
    scoreImprovement,
    totalEvents: history.length,
    positiveEvents,
    negativeEvents,
  };
}

/**
 * Cache key for localStorage
 */
function getCacheKey(address: string): string {
  return `credit-score-history-${address}`;
}

/**
 * Cache the credit score history in localStorage
 */
export function cacheCreditScoreHistory(address: string, history: CreditScoreSnapshot[]): void {
  try {
    localStorage.setItem(
      getCacheKey(address),
      JSON.stringify({
        timestamp: Date.now(),
        history,
      })
    );
  } catch (error) {
    console.error('Failed to cache credit score history:', error);
  }
}

/**
 * Get cached credit score history from localStorage
 */
export function getCachedCreditScoreHistory(
  address: string
): CreditScoreSnapshot[] | null {
  try {
    const cached = localStorage.getItem(getCacheKey(address));
    if (!cached) return null;
    
    const { timestamp, history } = JSON.parse(cached);
    
    // Cache expires after 5 minutes
    if (Date.now() - timestamp > 5 * 60 * 1000) {
      localStorage.removeItem(getCacheKey(address));
      return null;
    }
    
    return history;
  } catch (error) {
    console.error('Failed to get cached credit score history:', error);
    return null;
  }
}

/**
 * Clear credit score history cache
 */
export function clearCreditScoreHistoryCache(address: string): void {
  localStorage.removeItem(getCacheKey(address));
}
