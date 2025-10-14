import {
  PostConditionMode,
  uintCV,
  principalCV,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { UserSession } from '@stacks/connect';

const network = {
  coreApiUrl: 'https://api.testnet.hiro.so',
};
const contractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const contractName = 'credora';

export interface LenderInfo {
  balance: number;
  locked_block: number;
  unlock_block: number;
  lender_pool_balance: number;
  time_in_pool_in_seconds: number;
}

export interface LendingPoolInfo {
  lock_duration_in_days: number;
  pool_size: number;
  contract_balance: number;
}

export interface BorrowerInfo {
  active_loan?: {
    amount: number;
    due_block: number;
    interest_rate: number;
    issued_block: number;
  };
  account_data?: {
    total_loans: number;
    on_time_loans: number;
    late_loans: number;
  };
  repayment_amount_due: number;
}

export interface LoanEligibilityInfo {
  message: string;
  loan_limit: number;
  interest_rate: number;
  duration: number;
}

export interface LoanLimitInfo {
  credit_score: number;
  credit_score_limit: number;
  average_balance: number;
  loan_limit: number;
}

export async function lendToPool(
  _userSession: UserSession,
  amount: number,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  const functionArgs = [uintCV(amount)];

  await openContractCall({
    network: 'testnet' as any,
    contractAddress,
    contractName,
    functionName: 'lend',
    functionArgs,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [],
    onFinish,
    onCancel,
  });
}

export async function withdrawFromPool(
  _userSession: UserSession,
  amount: number,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  const functionArgs = [uintCV(amount)];

  await openContractCall({
    network: 'testnet' as any,
    contractAddress,
    contractName,
    functionName: 'withdraw',
    functionArgs,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [],
    onFinish,
    onCancel,
  });
}

export async function applyForLoan(
  _userSession: UserSession,
  amount: number,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  const functionArgs = [uintCV(amount)];

  await openContractCall({
    network: 'testnet' as any,
    contractAddress,
    contractName,
    functionName: 'apply-for-loan',
    functionArgs,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [],
    onFinish,
    onCancel,
  });
}

export async function repayLoan(
  _userSession: UserSession,
  borrowerAddress: string,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  const functionArgs = [principalCV(borrowerAddress)];

  await openContractCall({
    network: 'testnet' as any,
    contractAddress,
    contractName,
    functionName: 'repay-loan',
    functionArgs,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [],
    onFinish,
    onCancel,
  });
}

export async function getLenderInfo(address: string): Promise<LenderInfo | null> {
  try {
    const response = await fetch(
      `${network.coreApiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/get-lender-info`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: address,
          arguments: [],
        }),
      }
    );

    const data = await response.json();
    if (data.okay && data.result) {
      return parseLenderInfo(data.result);
    }
    return null;
  } catch (error) {
    console.error('Error fetching lender info:', error);
    return null;
  }
}

export async function getLendingPoolInfo(): Promise<LendingPoolInfo | null> {
  try {
    const response = await fetch(
      `${network.coreApiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/get-lending-pool-info`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: contractAddress,
          arguments: [],
        }),
      }
    );

    const data = await response.json();
    if (data.okay && data.result) {
      return parseLendingPoolInfo(data.result);
    }
    return null;
  } catch (error) {
    console.error('Error fetching lending pool info:', error);
    return null;
  }
}

export async function getBorrowerInfo(address: string): Promise<BorrowerInfo | null> {
  try {
    const response = await fetch(
      `${network.coreApiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/get-borrower-info`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: address,
          arguments: [principalCV(address)],
        }),
      }
    );

    const data = await response.json();
    if (data.okay && data.result) {
      return parseBorrowerInfo(data.result);
    }
    return null;
  } catch (error) {
    console.error('Error fetching borrower info:', error);
    return null;
  }
}

export async function getLoanEligibilityInfo(address: string): Promise<LoanEligibilityInfo | null> {
  try {
    const response = await fetch(
      `${network.coreApiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/get-loan-eligibility-info`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: address,
          arguments: [principalCV(address)],
        }),
      }
    );

    const data = await response.json();
    if (data.okay && data.result) {
      return parseLoanEligibilityInfo(data.result);
    }
    return null;
  } catch (error) {
    console.error('Error fetching loan eligibility:', error);
    return null;
  }
}

export async function getLoanLimitInfo(address: string): Promise<LoanLimitInfo | null> {
  try {
    const response = await fetch(
      `${network.coreApiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/get-loan-limit-info`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: address,
          arguments: [principalCV(address)],
        }),
      }
    );

    const data = await response.json();
    if (data.okay && data.result) {
      return parseLoanLimitInfo(data.result);
    }
    return null;
  } catch (error) {
    console.error('Error fetching loan limit info:', error);
    return null;
  }
}

function parseLenderInfo(_result: string): LenderInfo {
  return {
    balance: 0,
    locked_block: 0,
    unlock_block: 0,
    lender_pool_balance: 0,
    time_in_pool_in_seconds: 0,
  };
}

function parseLendingPoolInfo(_result: string): LendingPoolInfo {
  return {
    lock_duration_in_days: 0,
    pool_size: 0,
    contract_balance: 0,
  };
}

function parseBorrowerInfo(_result: string): BorrowerInfo {
  return {
    repayment_amount_due: 0,
  };
}

function parseLoanEligibilityInfo(_result: string): LoanEligibilityInfo {
  return {
    message: 'eligible for loan',
    loan_limit: 0,
    interest_rate: 15,
    duration: 14,
  };
}

function parseLoanLimitInfo(_result: string): LoanLimitInfo {
  return {
    credit_score: 0,
    credit_score_limit: 0,
    average_balance: 0,
    loan_limit: 0,
  };
}
