/**
 * Transaction History Service
 * Fetches and parses contract events from Stacks blockchain
 */

import { CREDORA_CONTRACT } from '@/lib/contracts/credora';

const CREDORA_CONTRACT_ADDRESS = CREDORA_CONTRACT.address;
const CREDORA_CONTRACT_NAME = CREDORA_CONTRACT.name;

export interface BlockchainTransaction {
  txId: string;
  type: 'deposit' | 'withdraw' | 'borrow' | 'repay';
  amount: bigint;
  timestamp: number;
  blockHeight: number;
  status: 'success' | 'failed';
  sender: string;
  eventType?: string;
}

interface StacksEvent {
  tx_id: string;
  tx_status: string;
  block_height: number;
  burn_block_time: number;
  contract_log?: {
    value: {
      hex: string;
      repr: string;
    };
  };
}

interface StacksTransaction {
  tx_id: string;
  tx_status: string;
  block_height: number;
  burn_block_time: number;
  tx_type: string;
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
}

/**
 * Fetch transactions for a specific address from Stacks API
 */
export async function fetchAddressTransactions(
  address: string,
  limit: number = 50
): Promise<BlockchainTransaction[]> {
  console.log('🔄 fetchAddressTransactions called for:', address);
  try {
    const apiUrl = `https://api.testnet.hiro.so/extended/v1/address/${address}/transactions?limit=${limit}`;
    console.log('📡 Fetching from:', apiUrl);
    
    const response = await fetch(apiUrl);
    
    // Log full response for debugging
    console.log('📡 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API request failed:', response.status, errorText);
      throw new Error(`Failed to fetch transactions: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📥 API response:', data);
    const transactions: BlockchainTransaction[] = [];

    for (const tx of data.results as StacksTransaction[]) {
      // Only process contract calls to our Credora contract
      if (tx.tx_type === 'contract_call' && tx.contract_call) {
        const contractId = tx.contract_call.contract_id;
        const functionName = tx.contract_call.function_name;
        
        console.log('🔍 Checking transaction:', { contractId, functionName, txId: tx.tx_id });
        
        // Check if it's a call to our contract (check both name and address)
        if (contractId.includes(CREDORA_CONTRACT_NAME) || contractId.includes(CREDORA_CONTRACT_ADDRESS)) {
          console.log('✅ Matched Credora contract transaction');
          const parsedTx = parseTransaction(tx);
          if (parsedTx) {
            console.log('✅ Parsed transaction:', parsedTx);
            transactions.push(parsedTx);
          } else {
            console.log('❌ Failed to parse transaction');
          }
        }
      }
    }
    
    console.log('📊 Total transactions found:', transactions.length);

    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

/**
 * Parse a Stacks transaction into our Transaction format
 */
function parseTransaction(tx: StacksTransaction): BlockchainTransaction | null {
  if (!tx.contract_call) return null;

  const functionName = tx.contract_call.function_name;
  let type: BlockchainTransaction['type'];
  let amount = BigInt(0);

  // Map function names to transaction types
  switch (functionName) {
    case 'lend':
      type = 'deposit';
      amount = extractAmountFromArgs(tx.contract_call.function_args);
      break;
    case 'withdraw':
      type = 'withdraw';
      amount = extractAmountFromArgs(tx.contract_call.function_args);
      break;
    case 'borrow':
      type = 'borrow';
      amount = extractAmountFromArgs(tx.contract_call.function_args);
      break;
    case 'repay-loan':
      type = 'repay';
      // For repay, we need to get the amount from the loan data
      // For now, we'll mark it and fetch details separately if needed
      amount = BigInt(0);
      break;
    default:
      return null;
  }

  return {
    txId: tx.tx_id,
    type,
    amount,
    timestamp: tx.burn_block_time,
    blockHeight: tx.block_height,
    status: tx.tx_status === 'success' ? 'success' : 'failed',
    sender: tx.sender_address,
  };
}

/**
 * Extract amount from function arguments
 */
function extractAmountFromArgs(args: StacksTransaction['contract_call']['function_args']): bigint {
  if (!args || args.length === 0) return BigInt(0);
  
  // Amount is typically the first argument
  const amountArg = args.find(arg => arg.name === 'amount' || arg.type === 'uint');
  if (!amountArg) return BigInt(0);

  try {
    // Parse the repr which looks like "u10000000"
    const match = amountArg.repr.match(/u(\d+)/);
    if (match) {
      return BigInt(match[1]);
    }
  } catch (error) {
    console.error('Error parsing amount:', error);
  }

  return BigInt(0);
}

/**
 * Fetch contract events (print statements) from the blockchain
 */
export async function fetchContractEvents(
  address: string,
  limit: number = 50
): Promise<BlockchainTransaction[]> {
  try {
    const contractId = `${CREDORA_CONTRACT_ADDRESS}.${CREDORA_CONTRACT_NAME}`;
    const apiUrl = `https://api.testnet.hiro.so/extended/v1/contract/${contractId}/events?limit=${limit}`;
    
    console.log('📡 Fetching events from:', apiUrl);
    const response = await fetch(apiUrl);
    console.log('📡 Events response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Events API failed:', response.status, errorText);
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📥 Events API response:', data);
    const transactions: BlockchainTransaction[] = [];

    for (const event of data.results as StacksEvent[]) {
      if (event.contract_log) {
        const parsedEvent = parseContractEvent(event, address);
        if (parsedEvent) {
          transactions.push(parsedEvent);
        }
      }
    }

    return transactions;
  } catch (error) {
    console.error('Error fetching contract events:', error);
    return [];
  }
}

/**
 * Parse contract event logs (print statements)
 */
function parseContractEvent(event: StacksEvent, userAddress: string): BlockchainTransaction | null {
  if (!event.contract_log) return null;

  try {
    const logRepr = event.contract_log.value.repr;
    
    // Parse the tuple structure from the contract print statements
    // Format: {event: "lend_successful", user: 'ST...', amount: u10000000, ...}
    
    let eventType: string = '';
    let amount = BigInt(0);
    let user = '';
    
    // Extract event type
    const eventMatch = logRepr.match(/event:\s*"([^"]+)"/);
    if (eventMatch) {
      eventType = eventMatch[1];
    }
    
    // Extract user
    const userMatch = logRepr.match(/user:\s*'([^']+)'/);
    if (userMatch) {
      user = userMatch[1];
    }
    
    // Only include events for this user
    if (user !== userAddress) return null;
    
    // Extract amount
    const amountMatch = logRepr.match(/amount:\s*u(\d+)/);
    if (amountMatch) {
      amount = BigInt(amountMatch[1]);
    }

    // Map event types to transaction types
    let type: BlockchainTransaction['type'];
    switch (eventType) {
      case 'lend_sucessful': // Note: contract has typo "sucessful"
      case 'lend_successful':
        type = 'deposit';
        break;
      case 'withdrawal_successful':
        type = 'withdraw';
        break;
      case 'loan_approved':
        type = 'borrow';
        break;
      case 'loan_repaid_on_time':
      case 'loan_repaid_late':
        type = 'repay';
        break;
      default:
        return null;
    }

    return {
      txId: event.tx_id,
      type,
      amount,
      timestamp: event.burn_block_time,
      blockHeight: event.block_height,
      status: event.tx_status === 'success' ? 'success' : 'failed',
      sender: user,
      eventType,
    };
  } catch (error) {
    console.error('Error parsing contract event:', error);
    return null;
  }
}

/**
 * Fetch all transactions (both contract calls and events)
 * Combines both sources and removes duplicates
 */
export async function fetchAllTransactions(
  address: string,
  limit: number = 50
): Promise<BlockchainTransaction[]> {
  console.log('🚀 fetchAllTransactions starting for address:', address);
  const [txTransactions, eventTransactions] = await Promise.all([
    fetchAddressTransactions(address, limit),
    fetchContractEvents(address, limit),
  ]);
  console.log('✅ Fetched transactions:', { txTransactions: txTransactions.length, eventTransactions: eventTransactions.length });

  // Combine and deduplicate by txId
  const allTransactions = [...txTransactions, ...eventTransactions];
  const uniqueTransactions = Array.from(
    new Map(allTransactions.map(tx => [tx.txId, tx])).values()
  );

  // Sort by timestamp (newest first)
  return uniqueTransactions.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Cache transactions in LocalStorage
 */
const CACHE_KEY_PREFIX = 'credora_tx_history_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function getCachedTransactions(address: string): BlockchainTransaction[] | null {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${address}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    
    // Check if cache is still valid
    if (Date.now() - timestamp > CACHE_DURATION) {
      console.log('🗑️ Cache expired, clearing...');
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    // Don't return empty cache - force refetch
    if (!data || data.length === 0) {
      console.log('🗑️ Empty cache detected, clearing to force refetch...');
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    // Parse bigint values
    return data.map((tx: any) => ({
      ...tx,
      amount: BigInt(tx.amount),
    }));
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

export function clearTransactionCache(address?: string): void {
  try {
    if (address) {
      const cacheKey = `${CACHE_KEY_PREFIX}${address}`;
      localStorage.removeItem(cacheKey);
      console.log('🗑️ Cleared cache for address:', address);
    } else {
      // Clear all transaction caches
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      console.log('🗑️ Cleared all transaction caches');
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

export function cacheTransactions(address: string, transactions: BlockchainTransaction[]): void {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${address}`;
    const cacheData = {
      data: transactions.map(tx => ({
        ...tx,
        amount: tx.amount.toString(), // Convert bigint to string for JSON
      })),
      timestamp: Date.now(),
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}
