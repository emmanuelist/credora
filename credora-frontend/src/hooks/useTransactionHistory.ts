import { useQuery } from '@tanstack/react-query';
import { useWalletStore } from '@/stores/walletStore';
import { 
  fetchAllTransactions, 
  getCachedTransactions, 
  cacheTransactions,
  type BlockchainTransaction 
} from '@/services/transactionHistory.service';

// Re-export types for convenience
export type { BlockchainTransaction as Transaction } from '@/services/transactionHistory.service';

// Legacy interface for backward compatibility
export interface ParsedTransaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'borrow' | 'repay';
  amount: bigint;
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
  blockHeight: number;
  txId: string;
}

/**
 * Hook for fetching transaction history with caching
 */
export function useTransactionHistory(walletAddress?: string) {
  const { address: storeAddress, isWalletConnected } = useWalletStore();
  const address = walletAddress || storeAddress;

  console.log('🎣 useTransactionHistory called:', { 
    walletAddress, 
    storeAddress, 
    address, 
    isWalletConnected,
    enabled: isWalletConnected && !!address 
  });

  return useQuery({
    queryKey: ['transactionHistory', address],
    queryFn: async () => {
      console.log('🔥 queryFn executing for address:', address);
      if (!address) {
        console.log('❌ No address, returning empty array');
        return [];
      }

      try {
        // Try to get from cache first
        const cached = getCachedTransactions(address);
        console.log('💾 Cache check result:', cached ? `Found ${cached.length} transactions` : 'No cache');
        if (cached) {
          console.log('✅ Returning cached transactions');
          return cached;
        }

        console.log('🌐 No cache, fetching from blockchain...');
        // Fetch from blockchain
        const transactions = await fetchAllTransactions(address, 50);
        console.log('📦 Fetched transactions count:', transactions.length);
        
        // Cache the results
        cacheTransactions(address, transactions);
        
        return transactions;
        return transactions;
      } catch (error) {
        console.error('Error fetching transaction history:', error);
        return [];
      }
    },
    enabled: isWalletConnected && !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 2 * 60 * 1000, // Auto-refetch every 2 minutes
  });
}

/**
 * Hook for filtered transactions
 */
export function useFilteredTransactions(type?: BlockchainTransaction['type'], walletAddress?: string) {
  const { data: allTransactions, ...rest } = useTransactionHistory(walletAddress);

  const filteredTransactions = type
    ? allTransactions?.filter(tx => tx.type === type)
    : allTransactions;

  return {
    data: filteredTransactions,
    ...rest,
  };
}
