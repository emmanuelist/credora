import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWalletStore } from '@/stores/walletStore';
import {
  callCredoraReadOnly,
  callCredoraWrite,
  parseContractResponse,
  CREDORA_CONTRACT,
  SBTC_CONTRACT,
  getCurrentBlockHeight,
  getErrorMessage,
  waitForTransaction,
  getSBTCBalance,
  getSTXBalance,
} from '@/lib/contracts/credora';
import { Pc } from '@stacks/transactions';
import { 
  principalCV, 
  uintCV,
} from '@stacks/transactions';
import { CreditScore, LoanInfo, LenderInfo, PoolInfo } from '@/types/credora.types';
import { getCreditTier } from '@/types/credora.types';
import { toast } from 'sonner';

// Cache for current block height (updated every 30 seconds)
let cachedBlockHeight: number | null = null;
let lastFetchTime: number = 0;

async function getCachedBlockHeight(): Promise<number> {
  const now = Date.now();
  if (cachedBlockHeight && now - lastFetchTime < 30000) {
    return cachedBlockHeight;
  }
  
  cachedBlockHeight = await getCurrentBlockHeight();
  lastFetchTime = now;
  return cachedBlockHeight;
}

// Read hooks
export function useCreditScore() {
  const { address, isWalletConnected } = useWalletStore();

  return useQuery({
    queryKey: ['creditScore', address],
    queryFn: async () => {
      if (!address) throw new Error('Wallet not connected');
      
      // Fetch detailed credit score info
      const scoreResponse = await callCredoraReadOnly(
        'get-loan-limit-info',
        [principalCV(address)],
        address
      );

      // Fetch account data for loan history
      const borrowerResponse = await callCredoraReadOnly(
        'get-borrower-info',
        [principalCV(address)],
        address
      );

      const scoreData = scoreResponse as any;
      const scoreValues = scoreData.value || scoreData;
      
      const borrowerData = borrowerResponse as any;
      const borrowerValues = borrowerData.value || borrowerData;
      const accountData = borrowerValues.account_data?.value || {};
      
      // Extract values from contract response
      const creditScore = Number(scoreValues.credit_score?.value || 0);
      const averageBalance = BigInt(scoreValues.average_balance?.value || 0);
      const totalLoans = BigInt(accountData.total_loans?.value || 0);
      const onTimeLoans = BigInt(accountData.on_time_loans?.value || 0);
      const lateLoans = BigInt(accountData.late_loans?.value || 0);
      
      // Calculate component scores using the same logic as contract
      // Repayment score: 0-700 points (70%)
      // Activity score: 0-300 points (30%)
      const repaymentScore = Math.floor((Number(onTimeLoans) * 700) / (Number(totalLoans) + (Number(totalLoans) < 5 ? 5 : 0)) || 0);
      const activityScore = creditScore - repaymentScore;
      
      return {
        total: creditScore,
        activityScore,
        repaymentScore,
        tier: getCreditTier(creditScore),
        totalLoans,
        onTimeLoans,
        lateLoans,
        averageBalance,
      } as CreditScore;
    },
    enabled: isWalletConnected && !!address,
    staleTime: 30000, // Cache for 30 seconds
  });
}

export function useLoanInfo() {
  const { address, isWalletConnected } = useWalletStore();

  return useQuery({
    queryKey: ['loanInfo', address],
    queryFn: async () => {
      if (!address) throw new Error('Wallet not connected');
      
      const response = await callCredoraReadOnly(
        'get-borrower-info',
        [principalCV(address)],
        address
      );

      const data = response as any;
      const values = data.value || data;
      
      // Check active_loan (optional - can be none)
      const activeLoan = values.active_loan?.value;
      
      // If no active loan or loan is none, return null
      if (!activeLoan || activeLoan.type === 'none' || activeLoan === 'none') {
        return null;
      }
      
      // Extract loan data from the nested structure
      const loanData = activeLoan.value || activeLoan;
      const amount = BigInt(loanData.amount?.value || 0);
      
      // If amount is 0, no active loan
      if (amount === BigInt(0)) {
        return null;
      }

      const currentBlock = await getCachedBlockHeight();
      const dueBlock = Number(loanData.due_block?.value || 0);
      const issuedBlock = Number(loanData.issued_block?.value || 0);
      const interestRate = Number(loanData.interest_rate?.value || 15);
      const blocksRemaining = Math.max(0, dueBlock - currentBlock);
      const daysRemaining = Math.floor(blocksRemaining / 144); // ~144 blocks/day
      
      // Get repayment amount from values
      const repaymentAmount = BigInt(values.repayment_amount_due?.value || 0);

      return {
        amount: amount,
        dueBlock: dueBlock,
        interestRate: interestRate,
        issuedBlock: issuedBlock,
        repaymentAmount: repaymentAmount,
        isOverdue: currentBlock > dueBlock,
        daysRemaining,
      } as LoanInfo;
    },
    enabled: isWalletConnected && !!address,
    staleTime: 30000,
  });
}

export function useLenderInfo() {
  const { address, isWalletConnected } = useWalletStore();

  return useQuery({
    queryKey: ['lenderInfo', address],
    queryFn: async () => {
      if (!address) throw new Error('Wallet not connected');
      
      const response = await callCredoraReadOnly(
        'get-lender-info',
        [],
        address
      );

      const data = response as any;
      
      // Handle nested structure from cvToValue
      const values = data.value || data;
      
      const currentBlock = await getCachedBlockHeight();
      
      // Parse nested Clarity values
      const lenderBalance = BigInt(values.lender_balance?.value || 0);
      const poolBalance = BigInt(values.lender_pool_balance?.value || 0);
      const lockedBlock = Number(values.locked_block?.value || 0);
      const unlockBlock = Number(values.unlock_block?.value || 0);

      return {
        balance: lenderBalance,
        poolBalance: poolBalance,
        lockedBlock: lockedBlock,
        unlockBlock: unlockBlock,
        earnings: poolBalance - lenderBalance, // Interest earned = pool balance - original deposit
        isLocked: currentBlock < unlockBlock,
      } as LenderInfo;
    },
    enabled: isWalletConnected && !!address,
    staleTime: 30000,
  });
}

export function usePoolInfo() {
  const { address } = useWalletStore();

  return useQuery({
    queryKey: ['poolInfo'],
    queryFn: async () => {
      const response = await callCredoraReadOnly(
        'get-lending-pool-info',
        [],
        address || CREDORA_CONTRACT.address
      );

      const data = response as any;
      const values = data.value || data;
      
      const totalPool = BigInt(values.pool_size?.value || 0);
      const contractBalance = BigInt(values.contract_balance?.value || 0);
      const lockDuration = Number(values.lock_duration_in_days?.value || 14);
      
      // Calculate utilization rate (how much is borrowed vs total)
      const utilizationRate = totalPool > 0
        ? 100 - Number((contractBalance * BigInt(100)) / totalPool)
        : 0;
      
      // Calculate APY based on utilization (10-20% range)
      const currentAPY = 10 + (utilizationRate * 0.1);

      return {
        totalPool,
        contractBalance,
        currentAPY,
        lockDuration: lockDuration * 144, // Convert days to blocks (144 blocks/day)
        utilizationRate,
      } as PoolInfo;
    },
    staleTime: 60000, // Cache pool info for 1 minute
    refetchInterval: 60000, // Refetch every minute
  });
}

// Get sBTC balance for connected wallet
export function useSBTCBalance() {
  const { address, isWalletConnected } = useWalletStore();

  return useQuery({
    queryKey: ['sbtcBalance', address],
    queryFn: async () => {
      if (!address) return BigInt(0);
      return getSBTCBalance(address);
    },
    enabled: isWalletConnected && !!address,
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 30000, // Auto-refetch every 30 seconds
  });
}

// Get STX balance for connected wallet
export function useSTXBalance() {
  const { address, isWalletConnected } = useWalletStore();

  return useQuery({
    queryKey: ['stxBalance', address],
    queryFn: async () => {
      if (!address) return BigInt(0);
      return getSTXBalance(address);
    },
    enabled: isWalletConnected && !!address,
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 30000, // Auto-refetch every 30 seconds
  });
}

// Write hooks
export function useLend() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();

  return useMutation({
    mutationFn: async (amount: bigint) => {
      if (!address) throw new Error('Wallet not connected');

      // Check sBTC balance before proceeding
      const balance = await getSBTCBalance(address);

      if (balance < amount) {
        throw new Error(`Insufficient sBTC balance. You have ${Number(balance) / 100000000} sBTC but need ${Number(amount) / 100000000} sBTC.`);
      }

      // Minimum deposit check (0.1 sBTC = 10,000,000 satoshis)
      if (amount < BigInt(10000000)) {
        throw new Error('Minimum deposit is 0.1 sBTC (10,000,000 satoshis)');
      }

      // Create post-condition: user will send <= amount of sBTC tokens
      const postConditions = [
        Pc.principal(address)
          .willSendLte(amount)
          .ft(`${SBTC_CONTRACT.address}.${SBTC_CONTRACT.name}`, 'sbtc-token')
      ];

      return new Promise((resolve, reject) => {
        callCredoraWrite(
          'lend',
          [uintCV(amount)],
          address,
          async (data) => {
            toast.success('Transaction submitted!', {
              description: 'Waiting for confirmation...',
            });
            
            // Wait for transaction confirmation
            if (data.txId) {
              const success = await waitForTransaction(data.txId);
              if (success) {
                toast.success('Deposit successful!', {
                  description: 'Your funds have been added to the pool.',
                });
              } else {
                toast.error('Transaction failed', {
                  description: 'Please try again.',
                });
              }
            }
            
            resolve(data);
          },
          () => {
            toast.error('Transaction cancelled');
            reject(new Error('Transaction cancelled'));
          },
          postConditions
        );
      });
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['lenderInfo', address] });
      queryClient.invalidateQueries({ queryKey: ['poolInfo'] });
      queryClient.invalidateQueries({ queryKey: ['sbtcBalance', address] });
    },
    onError: (error: any) => {
      const errorCode = parseInt(error.message?.match(/\d+/)?.[0] || '0');
      if (errorCode) {
        toast.error('Transaction failed', {
          description: getErrorMessage(errorCode),
        });
      }
    },
  });
}

export function useWithdraw() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();

  return useMutation({
    mutationFn: async (amount: bigint) => {
      if (!address) throw new Error('Wallet not connected');

      console.log('💸 Withdraw called with amount:', amount.toString());

      // Create post-condition: contract will send >= amount of sBTC tokens to user
      const postConditions = [
        Pc.principal(CREDORA_CONTRACT.address)
          .willSendGte(amount)
          .ft(`${SBTC_CONTRACT.address}.${SBTC_CONTRACT.name}`, 'sbtc-token')
      ];

      console.log('📋 Post-condition amount:', amount.toString());

      return new Promise((resolve, reject) => {
        callCredoraWrite(
          'withdraw',
          [uintCV(amount)],
          address,
          async (data) => {
            toast.success('Transaction submitted!', {
              description: 'Processing withdrawal...',
            });
            
            if (data.txId) {
              const success = await waitForTransaction(data.txId);
              if (success) {
                toast.success('Withdrawal successful!', {
                  description: 'Funds have been sent to your wallet.',
                });
              } else {
                toast.error('Transaction failed', {
                  description: 'Please try again.',
                });
              }
            }
            
            resolve(data);
          },
          () => {
            toast.error('Transaction cancelled');
            reject(new Error('Transaction cancelled'));
          },
          postConditions
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lenderInfo', address] });
      queryClient.invalidateQueries({ queryKey: ['poolInfo'] });
    },
    onError: (error: any) => {
      const errorCode = parseInt(error.message?.match(/\d+/)?.[0] || '0');
      if (errorCode) {
        toast.error('Transaction failed', {
          description: getErrorMessage(errorCode),
        });
      }
    },
  });
}

export function useApplyForLoan() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();

  return useMutation({
    mutationFn: async (amount: bigint) => {
      if (!address) throw new Error('Wallet not connected');

      // Create post-condition: contract will send >= amount of sBTC tokens to user
      const postConditions = [
        Pc.principal(CREDORA_CONTRACT.address)
          .willSendGte(amount)
          .ft(`${SBTC_CONTRACT.address}.${SBTC_CONTRACT.name}`, 'sbtc-token')
      ];

      return new Promise((resolve, reject) => {
        callCredoraWrite(
          'apply-for-loan',
          [uintCV(amount)],
          address,
          async (data) => {
            toast.success('Loan application submitted!', {
              description: 'Processing your loan...',
            });
            
            if (data.txId) {
              const success = await waitForTransaction(data.txId);
              if (success) {
                toast.success('🎉 Loan approved!', {
                  description: 'Funds have been sent to your wallet.',
                });
              } else {
                toast.error('Loan application failed', {
                  description: 'Please check your eligibility and try again.',
                });
              }
            }
            
            resolve(data);
          },
          () => {
            toast.error('Transaction cancelled');
            reject(new Error('Transaction cancelled'));
          },
          postConditions
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanInfo', address] });
      queryClient.invalidateQueries({ queryKey: ['creditScore', address] });
      queryClient.invalidateQueries({ queryKey: ['poolInfo'] });
    },
    onError: (error: any) => {
      const errorCode = parseInt(error.message?.match(/\d+/)?.[0] || '0');
      if (errorCode) {
        toast.error('Loan application failed', {
          description: getErrorMessage(errorCode),
        });
      }
    },
  });
}

export function useRepayLoan() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();

  return useMutation({
    mutationFn: async (repaymentAmount: bigint) => {
      if (!address) throw new Error('Wallet not connected');

      // Check sBTC balance before proceeding
      const balance = await getSBTCBalance(address);
      if (balance < repaymentAmount) {
        throw new Error(`Insufficient sBTC balance. You have ${Number(balance) / 100000000} sBTC but need ${Number(repaymentAmount) / 100000000} sBTC.`);
      }

      // Create post-condition: user will send <= repaymentAmount of sBTC tokens
      const postConditions = [
        Pc.principal(address)
          .willSendLte(repaymentAmount)
          .ft(`${SBTC_CONTRACT.address}.${SBTC_CONTRACT.name}`, 'sbtc-token')
      ];

      return new Promise((resolve, reject) => {
        callCredoraWrite(
          'repay-loan',
          [],
          address,
          async (data) => {
            toast.success('Repayment submitted!', {
              description: 'Processing your repayment...',
            });
            
            if (data.txId) {
              const success = await waitForTransaction(data.txId);
              if (success) {
                toast.success('🎉 Loan repaid successfully!', {
                  description: 'Your credit score has been updated.',
                });
              } else {
                toast.error('Repayment failed', {
                  description: 'Please try again.',
                });
              }
            }
            
            resolve(data);
          },
          () => {
            toast.error('Transaction cancelled');
            reject(new Error('Transaction cancelled'));
          },
          postConditions
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanInfo', address] });
      queryClient.invalidateQueries({ queryKey: ['creditScore', address] });
      queryClient.invalidateQueries({ queryKey: ['poolInfo'] });
    },
    onError: (error: any) => {
      const errorCode = parseInt(error.message?.match(/\d+/)?.[0] || '0');
      if (errorCode) {
        toast.error('Repayment failed', {
          description: getErrorMessage(errorCode),
        });
      }
    },
  });
}
