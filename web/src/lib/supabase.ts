import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Transaction = {
  id: string;
  user_id?: string;
  wallet_address: string;
  transaction_type: 'lend' | 'withdraw' | 'borrow' | 'repay';
  amount: number;
  transaction_hash?: string;
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  created_at: string;
};

export type CreditScore = {
  id: string;
  wallet_address: string;
  credit_score: number;
  activity_score: number;
  repayment_score: number;
  average_balance: number;
  loan_limit: number;
  total_loans: number;
  on_time_loans: number;
  late_loans: number;
  updated_at: string;
};
