/*
  # Credora DeFi Lending Platform Database Schema

  ## Tables Created
  
  1. **users**
     - Stores wallet addresses and user profile data
     - `id` (uuid, primary key)
     - `wallet_address` (text, unique) - Stacks wallet address
     - `created_at` (timestamptz) - Account creation timestamp
     - `updated_at` (timestamptz) - Last update timestamp

  2. **transactions**
     - Logs all lending and borrowing activities
     - `id` (uuid, primary key)
     - `user_id` (uuid, foreign key to users)
     - `wallet_address` (text) - User's wallet address
     - `transaction_type` (text) - Type: lend, withdraw, borrow, repay
     - `amount` (bigint) - Amount in satoshis (sBTC uses 8 decimals)
     - `transaction_hash` (text) - Blockchain transaction hash
     - `status` (text) - Status: pending, completed, failed
     - `metadata` (jsonb) - Additional transaction data
     - `created_at` (timestamptz) - Transaction timestamp

  3. **credit_scores**
     - Caches credit score calculations for quick display
     - `id` (uuid, primary key)
     - `wallet_address` (text, unique) - User's wallet address
     - `credit_score` (integer) - Total credit score (0-1000)
     - `activity_score` (integer) - Activity component (0-300)
     - `repayment_score` (integer) - Repayment component (0-700)
     - `average_balance` (bigint) - 3-month average sBTC balance
     - `loan_limit` (bigint) - Maximum borrowable amount
     - `total_loans` (integer) - Total number of loans taken
     - `on_time_loans` (integer) - Number of on-time repayments
     - `late_loans` (integer) - Number of late repayments
     - `updated_at` (timestamptz) - Last calculation timestamp

  ## Security
  - RLS enabled on all tables
  - Users can only read their own data
  - Insert policies allow authenticated users to create their own records
  - Update policies allow users to update only their own records
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (wallet_address = current_setting('app.wallet_address', true))
  WITH CHECK (wallet_address = current_setting('app.wallet_address', true));

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('lend', 'withdraw', 'borrow', 'repay')),
  amount bigint NOT NULL,
  transaction_hash text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (wallet_address = current_setting('app.wallet_address', true))
  WITH CHECK (wallet_address = current_setting('app.wallet_address', true));

-- Create credit_scores table
CREATE TABLE IF NOT EXISTS credit_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE NOT NULL,
  credit_score integer DEFAULT 0,
  activity_score integer DEFAULT 0,
  repayment_score integer DEFAULT 0,
  average_balance bigint DEFAULT 0,
  loan_limit bigint DEFAULT 0,
  total_loans integer DEFAULT 0,
  on_time_loans integer DEFAULT 0,
  late_loans integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own credit scores"
  ON credit_scores FOR SELECT
  TO authenticated
  USING (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can insert own credit scores"
  ON credit_scores FOR INSERT
  TO authenticated
  WITH CHECK (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can update own credit scores"
  ON credit_scores FOR UPDATE
  TO authenticated
  USING (wallet_address = current_setting('app.wallet_address', true))
  WITH CHECK (wallet_address = current_setting('app.wallet_address', true));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_address ON transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_scores_wallet_address ON credit_scores(wallet_address);
