import { supabase } from './supabase';

export async function logTransaction(
  walletAddress: string,
  transactionType: 'lend' | 'withdraw' | 'borrow' | 'repay',
  amount: number,
  transactionHash?: string,
  metadata?: Record<string, any>
) {
  try {
    const { data, error } = await supabase.from('transactions').insert({
      wallet_address: walletAddress,
      transaction_type: transactionType,
      amount,
      transaction_hash: transactionHash,
      status: 'completed',
      metadata: metadata || {},
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error logging transaction:', error);
    return null;
  }
}

export async function updateCreditScore(
  walletAddress: string,
  creditScore: number,
  activityScore: number,
  repaymentScore: number,
  averageBalance: number,
  loanLimit: number,
  totalLoans: number,
  onTimeLoans: number,
  lateLoans: number
) {
  try {
    const { data, error } = await supabase
      .from('credit_scores')
      .upsert(
        {
          wallet_address: walletAddress,
          credit_score: creditScore,
          activity_score: activityScore,
          repayment_score: repaymentScore,
          average_balance: averageBalance,
          loan_limit: loanLimit,
          total_loans: totalLoans,
          on_time_loans: onTimeLoans,
          late_loans: lateLoans,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wallet_address' }
      );

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating credit score:', error);
    return null;
  }
}

export async function getCreditScore(walletAddress: string) {
  try {
    const { data, error } = await supabase
      .from('credit_scores')
      .select('*')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting credit score:', error);
    return null;
  }
}
