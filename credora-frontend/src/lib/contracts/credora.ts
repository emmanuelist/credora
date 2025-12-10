import { STACKS_TESTNET } from '@stacks/network';
import {
  fetchCallReadOnlyFunction,
  cvToValue,
  uintCV,
  principalCV,
  PostConditionMode,
} from '@stacks/transactions';

// Contract configuration
export const CREDORA_CONTRACT = {
  address: 'STHB047A30W99178TR7KE0784C2GV2206H98PPY',
  name: 'credora',
  network: STACKS_TESTNET,
} as const;

// sBTC Token contract (used for approvals and balance checks)
export const SBTC_CONTRACT = {
  address: 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT',
  name: 'sbtc-token',
  network: STACKS_TESTNET,
} as const;

// Stacks API base URL
const STACKS_API_URL = 'https://api.testnet.hiro.so';

// Helper to get current block height
export async function getCurrentBlockHeight(): Promise<number> {
  try {
    const response = await fetch(`${STACKS_API_URL}/v2/info`);
    const data = await response.json();
    return data.stacks_tip_height;
  } catch (error) {
    console.error('Error fetching block height:', error);
    throw error;
  }
}

// Helper to get STX balance
export async function getSTXBalance(address: string): Promise<bigint> {
  try {
    const response = await fetch(`${STACKS_API_URL}/extended/v1/address/${address}/balances`);
    const data = await response.json();
    return BigInt(data.stx.balance);
  } catch (error) {
    console.error('Error fetching STX balance:', error);
    return BigInt(0);
  }
}

// Helper to get transaction status
export async function getTransactionStatus(txId: string): Promise<{
  status: 'pending' | 'success' | 'failed';
  tx_result?: any;
}> {
  try {
    const response = await fetch(`${STACKS_API_URL}/extended/v1/tx/${txId}`);
    const data = await response.json();
    
    if (data.tx_status === 'pending') {
      return { status: 'pending' };
    } else if (data.tx_status === 'success') {
      return { status: 'success', tx_result: data.tx_result };
    } else {
      return { status: 'failed', tx_result: data.tx_result };
    }
  } catch (error) {
    console.error('Error fetching transaction status:', error);
    return { status: 'pending' };
  }
}

// Helper to wait for transaction confirmation
export async function waitForTransaction(
  txId: string,
  maxAttempts: number = 30,
  delayMs: number = 2000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const { status, tx_result } = await getTransactionStatus(txId);
    
    if (status === 'success') {
      return true;
    } else if (status === 'failed') {
      console.error('❌ Transaction failed with result:', tx_result);
      if (tx_result?.repr) {
        console.error('📋 Error repr:', tx_result.repr);
      }
      return false;
    }
    
    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  return false; // Timeout
}

// Error code to message mapping (from contract error constants)
export const CONTRACT_ERROR_MESSAGES: Record<number, string> = {
  100: 'Only admin can perform this action',
  101: 'Amount too small. Minimum deposit: 0.1 sBTC',
  102: 'You have no deposits in the lending pool',
  103: 'Withdrawal amount exceeds your pool balance',
  104: 'Not eligible for loan. Build credit by depositing sBTC first.',
  105: 'Insufficient pool liquidity. Try a smaller loan amount.',
  106: 'Funds are still locked. Check your unlock date on the Lending page.',
  107: 'Unable to retrieve historical blockchain data. Try again later.',
};

export function getErrorMessage(errorCode: number): string {
  return CONTRACT_ERROR_MESSAGES[errorCode] || `Transaction failed with error code ${errorCode}`;
}

// Helper to call read-only functions
export async function callCredoraReadOnly(
  functionName: string,
  functionArgs: any[] = [],
  senderAddress?: string
) {
  try {
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CREDORA_CONTRACT.address,
      contractName: CREDORA_CONTRACT.name,
      functionName,
      functionArgs,
      network: CREDORA_CONTRACT.network,
      senderAddress: senderAddress || CREDORA_CONTRACT.address,
    });

    const value = cvToValue(result);
    return value;
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error);
    throw error;
  }
}

// Helper to create and broadcast transactions
export async function callCredoraWrite(
  functionName: string,
  functionArgs: any[],
  senderAddress: string,
  onFinish?: (data: any) => void,
  onCancel?: () => void,
  postConditions?: any[]
) {
  const { openContractCall } = await import('@stacks/connect');
  
  return openContractCall({
    contractAddress: CREDORA_CONTRACT.address,
    contractName: CREDORA_CONTRACT.name,
    functionName,
    functionArgs,
    network: CREDORA_CONTRACT.network,
    postConditionMode: postConditions ? PostConditionMode.Deny : PostConditionMode.Allow,
    postConditions: postConditions || [],
    onFinish,
    onCancel,
  });
}

// Type helpers for contract responses
export interface ContractResponse<T> {
  success: boolean;
  value?: T;
}

// sBTC Token Functions

// Get sBTC balance for an address
export async function getSBTCBalance(address: string): Promise<bigint> {
  try {
    const response = await fetchCallReadOnlyFunction({
      contractAddress: SBTC_CONTRACT.address,
      contractName: SBTC_CONTRACT.name,
      functionName: 'get-balance',
      functionArgs: [principalCV(address)],
      network: SBTC_CONTRACT.network,
      senderAddress: address,
    });
    
    const result = cvToValue(response);
    return BigInt(result.value || 0);
  } catch (error) {
    console.error('Error fetching sBTC balance:', error);
    return BigInt(0);
  }
}

// Check if Credora contract has allowance to spend user's sBTC
// Note: SIP-010 tokens don't have allowances like ERC-20
// This is a placeholder - actual implementation depends on sBTC token contract
export async function checkSBTCAllowance(
  owner: string,
  spender: string = CREDORA_CONTRACT.address
): Promise<bigint> {
  // For now, return 0 as most Stacks tokens handle transfers directly
  // without pre-approval (transfer happens in same transaction)
  return BigInt(0);
}

// Approve Credora contract to spend sBTC (if needed by token contract)
export function approveSBTC(
  amount: bigint,
  address: string,
  onFinish?: (data: any) => void,
  onCancel?: () => void
) {
  // Note: Most SIP-010 tokens on Stacks don't require separate approval
  // The transfer happens atomically in the lend/repay transaction
  // This is here for compatibility if the sBTC token requires it
  
  return import('@stacks/connect').then(({ openContractCall }) => {
    return openContractCall({
      contractAddress: SBTC_CONTRACT.address,
      contractName: SBTC_CONTRACT.name,
      functionName: 'approve',
      functionArgs: [
        principalCV(`${CREDORA_CONTRACT.address}.${CREDORA_CONTRACT.name}`),
        uintCV(amount),
      ],
      network: SBTC_CONTRACT.network,
      postConditionMode: PostConditionMode.Deny,
      onFinish,
      onCancel,
    });
  });
}

export function parseContractResponse<T>(response: any): T {
  if (response.value?.value !== undefined) {
    return response.value.value as T;
  }
  return response.value as T;
}
