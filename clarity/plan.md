# Credora Bitcoin DeFi Lending Platform - Implementation Plan

## Project Overview

A production-ready Bitcoin DeFi lending platform built on Stacks blockchain with sBTC token integration. Users can borrow based on algorithmic credit scores or lend to earn yield. The platform features trust-scored lending without collateral, leveraging on-chain reputation.

### Contract Information

- **sBTC Token**: `ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token`
- **Pool Contract**: `ST2VXPMB7WBJRS0HPJENJD7FR35907JV4X1E64DGN.credora`
- **Network**: Stacks Testnet
- **Block Time**: 10 minutes (600 seconds)
- **sBTC Decimals**: 8 (satoshi precision)

### Credit Scoring Algorithm

- **Total Score**: 1000 points
  - Repayment Score: 0-700 points (based on loan history)
  - Activity Score: 0-300 points (based on 3-month average balance)
- **Tier System**: 6 tiers (0-5) with increasing loan limits
- **Eligibility**: Based on credit score AND 3-month average sBTC balance

### Data Storage Strategy

- **Primary Source**: Blockchain contract state (always source of truth)
- **Browser Storage**: LocalStorage for caching and user preferences
- **Session Storage**: Temporary transaction state
- **Memory Cache**: In-app state management with React Context
- **No Database**: All historical data reconstructed from blockchain events

---

## Phase 1: Foundation and Infrastructure

### 1.1 Dependencies and Environment Setup

**Status**: Not Started

**Required Packages**:

```json
{
  "@stacks/connect": "Latest version for wallet integration",
  "@stacks/transactions": "Contract interaction utilities",
  "@stacks/network": "Testnet/mainnet configuration",
  "@stacks/blockchain-api-client": "Blockchain queries and event history",
  "date-fns": "Human-readable date formatting",
  "recharts": "Chart visualizations"
}
```

**Environment Variables**:

- `VITE_STACKS_NETWORK`: testnet
- `VITE_SBTC_CONTRACT`: ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token
- `VITE_CREDORA_CONTRACT`: ST2VXPMB7WBJRS0HPJENJD7FR35907JV4X1E64DGN.credora
- `VITE_STACKS_API_URL`: <https://api.testnet.hiro.so>

**Files to Create**:

- `src/config/contracts.ts` - Contract addresses and constants
- `src/config/network.ts` - Network configuration
- `src/types/contract.types.ts` - TypeScript interfaces matching contract structures

**Notes**:

- Tailwind CSS and Lucide icons already available
- React 18 with TypeScript configured
- All data will be fetched from blockchain and cached locally

---

### 1.2 TypeScript Contract Type Definitions

**Status**: Not Started

**Files to Create**:

- `src/types/contract.types.ts`

**Contract Data Structures to Define**:

```typescript
// Lender Info (map: lender_info)
interface LenderInfo {
  balance: bigint;          // Amount deposited to pool
  locked_block: bigint;     // Block when funds were locked
  unlock_block: bigint;     // Block when funds can be withdrawn
}

// Active Loan (map: active_loans)
interface ActiveLoan {
  amount: bigint;           // Principal loan amount
  due_block: bigint;        // Block height when loan is due
  interest_rate: bigint;    // Interest rate in percent (e.g., 15 = 15%)
  issued_block: bigint;     // Block when loan was issued
}

// Account Data (map: account_data_map)
interface AccountData {
  total_loans: bigint;      // Total loans ever taken
  on_time_loans: bigint;    // Number of on-time repayments
  late_loans: bigint;       // Number of late repayments
}

// Read-only function responses
interface LoanLimitInfo {
  credit_score: bigint;           // Total credit score (0-1000)
  credit_score_limit: bigint;     // Loan limit based on credit tier
  average_balance: bigint;        // 3-month average sBTC balance
  loan_limit: bigint;             // Final loan limit (min of credit_score_limit, average_balance)
}

interface LoanEligibilityInfo {
  message: string;                // Eligibility status message
  loan_limit: bigint;             // Maximum borrowable amount
  interest_rate: bigint;          // Current interest rate
  duration: bigint;               // Loan duration in days
}

interface BorrowerInfo {
  active_loan: ActiveLoan | null;
  account_data: AccountData | null;
  repayment_amount_due: bigint;   // Total repayment (principal + interest)
}

interface LenderInfo {
  lender_balance: bigint;          // Original deposit amount
  lender_pool_balance: bigint;     // Current value including yield
  locked_block: bigint;
  unlock_block: bigint;
  time_in_pool_in_seconds: bigint;
}

interface LendingPoolInfo {
  lock_duration_in_days: bigint;
  pool_size: bigint;                // Total pool size (var: total_lending_pool)
  contract_balance: bigint;         // Actual sBTC in contract
}

// Contract Events
interface LendEvent {
  event: 'lend_sucessful';
  user: string;
  amount: bigint;
  locked_block: bigint;
  unlock_block: bigint;
}

interface WithdrawalEvent {
  event: 'withdrawal_sucessful';
  user: string;
  amount: bigint;
}

interface LoanGrantEvent {
  event: 'loan_grant_sucessful';
  user: string;
  amount: bigint;
  amount_to_repay: bigint;
  due_block: bigint;
  interest_rate: bigint;
  issued_block: bigint;
}

interface LoanRepaidEvent {
  event: 'loan_repaid_sucessfully';
  user: string;
  amount: bigint;
}
```

**Error Codes to Define**:

```typescript
enum ContractError {
  ERR_NOT_ADMIN = 100,
  ERR_INPUT_VALUE_TOO_SMALL = 101,
  ERR_NOT_A_LENDER = 102,
  ERR_POOL_SHARE_EXCEEDED = 103,
  ERR_NOT_ELIGIBLE = 104,
  ERR_FUNDS_NOT_AVAILABLE_NOW = 105,
  ERR_FUNDS_LOCKED = 106,
  ERR_UNABLE_TO_GET_BLOCK = 107
}
```

**Tier Constants**:

```typescript
const TIER_LIMITS = {
  TIER_0: 10_000n,      // 0.0001 BTC
  TIER_1: 50_000n,      // 0.0005 BTC
  TIER_2: 100_000n,     // 0.001 BTC
  TIER_3: 300_000n,     // 0.003 BTC
  TIER_4: 500_000n,     // 0.005 BTC
  TIER_5: 1_000_000n    // 0.01 BTC
} as const;
```

**Dependencies**: Phase 1.1 completed

---

### 1.3 Contract Interaction Service Architecture

**Status**: Not Started

**Files to Create**:

- `src/services/contract/base.service.ts` - Base contract interaction utilities
- `src/services/contract/read.service.ts` - Read-only contract functions
- `src/services/contract/write.service.ts` - Transaction functions
- `src/services/contract/events.service.ts` - Event fetching from blockchain API
- `src/services/contract/mock.service.ts` - Mock responses for development
- `src/utils/contract.utils.ts` - Helper functions

**Core Functionality**:

1. **Base Service** - Connection management, error handling, retry logic
2. **Read Service** - All read-only contract calls with caching
3. **Write Service** - Transaction building, signing, status tracking
4. **Events Service** - Fetch historical events from Stacks API
5. **Mock Service** - Development mode responses

**Key Features**:

- Automatic retry with exponential backoff
- Request caching with configurable TTL
- Transaction status polling
- Type-safe function wrappers
- Error mapping to user-friendly messages
- BigInt to decimal conversion utilities

**Event Fetching Strategy**:

- Use Stacks Blockchain API to query contract events
- Filter by contract address and event type
- Parse print events for loan_grant_sucessful, etc.
- Cache events in memory with periodic refresh
- Reconstruct historical data from events

**Dependencies**: Phase 1.2 completed

---

### 1.4 Wallet Integration Layer

**Status**: Partially Complete (Context exists)

**Files to Create**:

- `src/contexts/WalletContext.tsx` - Enhanced wallet provider
- `src/hooks/useWallet.ts` - Wallet hook with helpers
- `src/hooks/useBalance.ts` - sBTC balance tracking
- `src/hooks/useContractCall.ts` - Generic contract interaction hook

**Current Status**:

- Basic Stacks Connect integration exists
- Need to add contract-specific functionality
- Need balance fetching from sBTC contract
- Need transaction status tracking

**Enhancements Needed**:

1. Add sBTC balance fetching with auto-refresh
2. Add transaction history tracking (from events)
3. Add pending transaction state
4. Add network switching support
5. Add error state management
6. Add wallet disconnection cleanup

**Dependencies**: Phase 1.3 completed

---

### 1.5 Local Storage Management System

**Status**: Not Started

**Files to Create**:

- `src/services/storage/local-storage.service.ts`
- `src/services/storage/session-storage.service.ts`
- `src/hooks/useLocalStorage.ts`
- `src/types/storage.types.ts`

**LocalStorage Schema**:

```typescript
interface LocalStorageSchema {
  // User preferences
  'user_preferences': {
    theme: 'light' | 'dark';
    onboarding_completed: boolean;
    notification_preferences: {
      loan_due_soon: boolean;
      unlock_available: boolean;
    };
  };
  
  // Cache contract data (with timestamps)
  'cache_pool_stats': {
    data: LendingPoolInfo;
    timestamp: number;
    ttl: number;
  };
  
  'cache_user_data_{address}': {
    borrowerInfo: BorrowerInfo;
    lenderInfo: LenderInfo;
    creditScore: LoanLimitInfo;
    timestamp: number;
    ttl: number;
  };
  
  // Historical events (reconstructed from blockchain)
  'events_{address}': {
    loans: LoanGrantEvent[];
    repayments: LoanRepaidEvent[];
    deposits: LendEvent[];
    withdrawals: WithdrawalEvent[];
    last_synced_block: bigint;
  };
  
  // Transaction tracking
  'pending_transactions': {
    txId: string;
    type: 'lend' | 'withdraw' | 'apply-for-loan' | 'repay-loan';
    status: 'pending' | 'success' | 'failed';
    timestamp: number;
  }[];
}
```

**Functionality**:

1. Type-safe storage utilities
2. Automatic JSON serialization/deserialization
3. TTL-based cache invalidation
4. Storage quota management
5. Migration utilities for schema changes
6. Export/import user data

**Dependencies**: None

---

## Phase 2: Core Business Logic

### 2.1 Credit Score Calculation Engine

**Status**: Not Started

**Files to Create**:

- `src/services/credit/calculator.service.ts`
- `src/hooks/useCreditScore.ts`
- `src/components/CreditScore/CreditScoreBreakdown.tsx`
- `src/components/CreditScore/CreditScoreSimulator.tsx`

**Functionality**:

1. **Activity Score Calculation** (0-300 points):

   ```
   - average_balance = 0: 0 points
   - average_balance >= 10,000: 100 points
   - average_balance >= 50,000: 220 points
   - average_balance >= 100,000: 240 points
   - average_balance >= 300,000: 260 points
   - average_balance >= 500,000: 280 points
   - average_balance >= 1,000,000: 300 points
   ```

2. **Repayment Score Calculation** (0-700 points):

   ```
   - No loans: 0 points
   - Less than 5 loans: (on_time_loans * 700) / (total_loans + 5)
   - 5+ loans: (on_time_loans * 700) / total_loans
   ```

3. **Tier Determination**:

   ```
   - Score > 300: Tier 0 (limit: 10,000)
   - Score > 450: Tier 1 (limit: 50,000)
   - Score > 600: Tier 2 (limit: 100,000)
   - Score > 750: Tier 3 (limit: 300,000)
   - Score > 900: Tier 4 (limit: 500,000)
   - Score 901-1000: Tier 5 (limit: 1,000,000)
   ```

**UI Components**:

- Visual breakdown of repayment vs activity score
- Progress bars for each component
- Tier badge with current tier and next tier requirements
- Interactive simulator showing impact of actions
- Historical credit score chart (reconstructed from contract data and events)

**Data Source**:

- Fetch current credit score from contract: `get-loan-limit-info`
- Fetch account data from contract: `get-borrower-info`
- Calculate historical scores from cached events

**Dependencies**: Phase 1.3, 1.4, 1.5 completed

---

### 2.2 Average Balance History System

**Status**: Not Started

**Files to Create**:

- `src/services/balance/history.service.ts`
- `src/hooks/useAverageBalance.ts`
- `src/components/Balance/AverageBalanceChart.tsx`
- `src/components/Balance/BalanceTimeline.tsx`

**Functionality**:

1. **Contract Balance Snapshots**:
   - Query balance at block height: `stacks-block-height - 1 day`
   - Query balance at block height: `stacks-block-height - 31 days`
   - Query balance at block height: `stacks-block-height - 61 days`
   - Calculate average: `(balance_1 + balance_2 + balance_3) / 3`
   - Use Stacks Blockchain API to query historical state

2. **Block Height to Date Conversion**:

   ```
   - Block time: 600 seconds (10 minutes)
   - Blocks per day: 144 (24 * 60 / 10)
   - 1 day ago: current_block - 144
   - 31 days ago: current_block - 4,464
   - 61 days ago: current_block - 8,784
   ```

3. **Balance Stability Indicator**:
   - Show variance between 3 snapshots
   - Highlight if balance is trending up/down
   - Show impact on loan eligibility

4. **Local Caching**:
   - Cache balance snapshots in LocalStorage
   - Refresh daily or on user request
   - Store with block height timestamp

**UI Components**:

- Timeline showing 3-month balance history
- Visual indicator of average vs current balance
- Recommendations for maintaining higher average
- Impact on loan eligibility display

**Dependencies**: Phase 1.3, 1.4, 1.5 completed

---

### 2.3 Loan Eligibility Intelligence System

**Status**: Not Started

**Files to Create**:

- `src/services/loan/eligibility.service.ts`
- `src/hooks/useLoanEligibility.ts`
- `src/components/Loan/EligibilityChecker.tsx`
- `src/components/Loan/LoanSimulator.tsx`

**Functionality**:

1. **Real-time Eligibility Check**:
   - Call `get-loan-eligibility-info` from contract
   - Parse response message: "eligible for loan" or "address has an unpaid loan"
   - Display loan_limit, interest_rate, duration

2. **Eligibility Rules** (enforced by contract):
   - Must not have active unpaid loan
   - `total_loans == on_time_loans + late_loans` (data integrity check)
   - `average_balance >= requested_amount` (balance check)
   - `tier_limit >= requested_amount` (credit score check)
   - Final limit: `min(average_balance, tier_limit)`

3. **Live Validation**:
   - As user types loan amount, show:
     - Green checkmark if eligible
     - Red X if ineligible with specific reason
     - Orange warning if close to limit
   - Show which constraint is limiting (credit score vs average balance)

4. **What-If Scenarios**:
   - Show repayment amount for different loan amounts
   - Calculate interest: `principal + (principal * interest_rate / 100)`
   - Show due date based on current block + loan_duration_in_blocks
   - Estimate credit score impact after successful repayment

**UI Components**:

- Live eligibility status badge
- Loan amount slider with min (0) and max (loan_limit)
- Breakdown showing: credit limit, balance limit, final limit
- Repayment calculator
- Interest breakdown visualization
- Due date countdown estimator

**Dependencies**: Phase 2.1, 2.2 completed

---

### 2.4 Lender Pool Analytics Engine

**Status**: Not Started

**Files to Create**:

- `src/services/pool/analytics.service.ts`
- `src/hooks/usePoolAnalytics.ts`
- `src/components/Pool/PoolUtilization.tsx`
- `src/components/Pool/APYCalculator.tsx`
- `src/components/Pool/EarningsProjector.tsx`

**Functionality**:

1. **Pool Utilization Metrics**:
   - Total Pool Size: `var total_lending_pool`
   - Contract Balance: `get-balance of sBTC contract`
   - Utilization Ratio: `(pool_size - contract_balance) / pool_size`
   - Available Liquidity: `contract_balance`

2. **APY Calculation**:

   ```
   - Profit = contract_balance - pool_size
   - If profit > 0: Pool is profitable
   - If profit < 0: Pool is at deficit (borrowers haven't repaid)
   - APY = (profit / pool_size) * (365 / time_in_days) * 100
   ```

3. **Individual Lender Share**:
   - Lender deposit: `lender_balance` from contract
   - Current value: `(lender_balance * contract_balance) / pool_size`
   - Earnings: `current_value - lender_balance`
   - Percentage share: `(lender_balance / pool_size) * 100`

4. **Earnings Projections**:
   - Based on historical APY (calculated from cached events)
   - Show conservative, average, optimistic scenarios
   - Factor in lock duration

5. **Historical Data from Events**:
   - Fetch all `lend_sucessful`, `withdrawal_sucessful` events
   - Reconstruct pool size over time
   - Calculate historical APY trends
   - Cache in LocalStorage

**UI Components**:

- Real-time pool utilization gauge
- Dynamic APY display with trend indicator
- Earnings calculator for different deposit amounts
- Lock duration display (from contract)
- Pool health indicator (profitable/unprofitable)
- Historical performance chart (APY over time from events)

**Dependencies**: Phase 1.3, 1.4, 1.5 completed

---

## Phase 3: Block Time and Transaction Management

### 3.1 Block Height Synchronization System

**Status**: Not Started

**Files to Create**:

- `src/services/blockchain/block.service.ts`
- `src/hooks/useBlockHeight.ts`
- `src/hooks/useBlockTime.ts`
- `src/utils/block.utils.ts`

**Functionality**:

1. **Block Height Tracking**:
   - Call `get-block-height` from contract OR use Stacks API
   - Poll every 30 seconds for updates
   - Store in React context for app-wide access
   - Detect new blocks and trigger data refresh

2. **Block to Timestamp Conversion**:

   ```typescript
   const BLOCK_TIME_SECONDS = 600; // 10 minutes
   const BLOCKS_PER_DAY = 144;
   const BLOCKS_PER_HOUR = 6;
   
   function blockToDate(blockHeight: bigint, currentBlock: bigint): Date {
     const blockDiff = Number(blockHeight - currentBlock);
     const secondsDiff = blockDiff * BLOCK_TIME_SECONDS;
     return new Date(Date.now() + (secondsDiff * 1000));
   }
   
   function daysToBlocks(days: number): bigint {
     return BigInt(days * BLOCKS_PER_DAY);
   }
   ```

3. **Time Remaining Calculator**:
   - Show countdown in blocks and human-readable format
   - Example: "42 blocks (~7 hours)" or "1,440 blocks (~10 days)"
   - Update every block or every minute

**UI Components**:

- Current block height display in header
- Time remaining components for due dates and unlock times
- Block countdown with progress bar
- Sync status indicator

**Dependencies**: Phase 1.3 completed

---

### 3.2 Transaction Flow State Machine

**Status**: Not Started

**Files to Create**:

- `src/services/transaction/manager.service.ts`
- `src/hooks/useTransaction.ts`
- `src/components/Transaction/TransactionModal.tsx`
- `src/components/Transaction/TransactionStatus.tsx`

**Functionality**:

1. **Transaction States**:

   ```typescript
   enum TransactionState {
     IDLE = 'idle',
     SIMULATING = 'simulating',
     WAITING_SIGNATURE = 'waiting_signature',
     BROADCASTING = 'broadcasting',
     PENDING = 'pending',
     SUCCESS = 'success',
     FAILED = 'failed'
   }
   ```

2. **Transaction Flow**:
   - **Idle**: User reviews action
   - **Simulating**: Show expected outcome before signing
   - **Waiting Signature**: Wallet popup open
   - **Broadcasting**: Sending to network
   - **Pending**: Waiting for confirmation (poll every 10s)
   - **Success**: Confirmed + post-condition check
   - **Failed**: Show error with recovery options

3. **Pre-Transaction Simulation**:
   - Estimate gas fees
   - Show expected state changes
   - Validate eligibility one more time
   - Display post-condition warnings

4. **Post-Transaction Verification**:
   - Confirm contract state changed as expected
   - Refresh relevant data (balances, loan status, pool info)
   - Show success message with transaction details
   - Update local cache
   - Store transaction in LocalStorage

5. **Transaction History**:
   - Store pending transactions in LocalStorage
   - Poll for status updates
   - Clean up completed transactions after 24 hours
   - Reconstruct full history from blockchain events

**UI Components**:

- Multi-step transaction modal
- Progress indicator showing current state
- Simulation results display
- Pending transaction tracker
- Transaction receipt with all details
- Error modal with troubleshooting steps

**Dependencies**: Phase 3.1 completed

---

### 3.3 Due Date and Countdown Management

**Status**: Not Started

**Files to Create**:

- `src/components/Countdown/LoanCountdown.tsx`
- `src/components/Countdown/UnlockCountdown.tsx`
- `src/hooks/useCountdown.ts`
- `src/utils/countdown.utils.ts`

**Functionality**:

1. **Loan Due Date Tracking**:
   - Read `due_block` from active loan
   - Calculate blocks remaining: `due_block - current_block`
   - Convert to time: `blocks_remaining * 10 minutes`
   - Show countdown: "3 days, 14 hours (504 blocks)"

2. **Late Payment Detection**:
   - If `current_block > due_block`: Loan is LATE
   - Show red warning badge
   - Display "X blocks overdue" or "X days overdue"
   - Show impact on credit score (will count as late_loans)

3. **Lender Unlock Tracking**:
   - Read `unlock_block` from lender info
   - Calculate blocks until unlock: `unlock_block - current_block`
   - Show eligibility status for withdrawal
   - Display countdown until funds unlocked

4. **Browser Notifications** (optional):
   - Request notification permission
   - Show browser notification when:
     - Loan due in 24 hours
     - Loan is overdue
     - Funds unlocked for withdrawal
   - Store notification preferences in LocalStorage

**UI Components**:

- Loan due date card with countdown
- Visual timeline showing loan lifecycle
- Late payment warning banner
- Unlock countdown for lenders
- Notification preference toggle
- Urgency indicators (green/yellow/red)

**Dependencies**: Phase 3.1 completed

---

## Phase 4: User Interface Development

### 4.1 Main Layout and Navigation

**Status**: Not Started

**Files to Create**:

- `src/components/Layout/MainLayout.tsx`
- `src/components/Layout/Header.tsx`
- `src/components/Layout/Sidebar.tsx`
- `src/components/Layout/MobileNav.tsx`

**Features**:

1. **Header**:
   - Credora logo (Lucide icon - use Coins or Bitcoin icon)
   - Current block height display
   - Network indicator (Testnet badge)
   - Wallet connection button with address/balance
   - Refresh data button
   - User menu dropdown

2. **Navigation**:
   - Dashboard (overview)
   - Borrow (loan application)
   - Lend (pool deposit)
   - My Account (history, credit score)
   - Pool Stats (analytics)
   - Mobile: Bottom tab bar with icons

3. **Responsive Design**:
   - Desktop: Sidebar navigation
   - Tablet: Collapsible sidebar
   - Mobile: Bottom navigation bar
   - Optimize for touch on mobile devices

**Dependencies**: Phase 1.4 completed

---

### 4.2 Borrower Dashboard

**Status**: Not Started

**Files to Create**:

- `src/pages/BorrowPage.tsx`
- `src/components/Borrow/BorrowForm.tsx`
- `src/components/Borrow/ActiveLoanCard.tsx`
- `src/components/Borrow/RepaymentCard.tsx`
- `src/components/Borrow/LoanHistoryTable.tsx`

**Features**:

1. **Active Loan Display** (if has active loan):
   - Loan amount and interest rate
   - Repayment amount due
   - Due date countdown with urgency indicator
   - Late payment warning if overdue
   - Repay button with amount breakdown
   - Transaction status tracker

2. **Loan Application Form** (if no active loan):
   - Credit score display at top
   - Loan amount input/slider (0 to loan_limit)
   - Real-time eligibility checker
   - Interest calculation display
   - Repayment amount preview
   - Due date estimation
   - Terms and conditions
   - Apply button with confirmation modal

3. **Loan History**:
   - Table of past loans reconstructed from events
   - Fetch `loan_grant_sucessful` and `loan_repaid_sucessfully` events
   - Columns: Amount, Issued Date, Status (On-time/Late), Repaid Date
   - Filter by status
   - Export to CSV button

**Data Source**:

- Active loan: `get-borrower-info` from contract
- Account data: `account_data_map` from contract
- Historical loans: Blockchain events via Stacks API
- Cache in LocalStorage with TTL

**UI Components**:

- Credit score badge with tier indicator
- Loan eligibility status card
- Loan amount selector with validation
- Repayment calculator
- Active loan summary card
- Transaction confirmation modal
- Success/error toasts

**Dependencies**: Phase 2.1, 2.2, 2.3, 3.2 completed

---

### 4.3 Lender Dashboard

**Status**: Not Started

**Files to Create**:

- `src/pages/LendPage.tsx`
- `src/components/Lend/DepositForm.tsx`
- `src/components/Lend/PositionCard.tsx`
- `src/components/Lend/WithdrawForm.tsx`
- `src/components/Lend/EarningsChart.tsx`

**Features**:

1. **Pool Overview**:
   - Total pool size
   - Available liquidity
   - Current APY with trend indicator
   - Utilization ratio gauge
   - Pool health status

2. **Deposit Form** (if no position or can add more):
   - Amount input (minimum: 0.1 sBTC = 10,000,000 sats)
   - Lock duration display (from contract)
   - Projected earnings calculator
   - Unlock date preview
   - APY estimate
   - Deposit button with confirmation

3. **Active Position Card** (if has deposit):
   - Original deposit amount
   - Current value (including yield)
   - Earnings (profit/loss)
   - Percentage gain/loss
   - Time in pool
   - Unlock date countdown
   - Withdrawal eligibility indicator
   - Withdraw button (enabled if unlocked)

4. **Withdrawal Form** (if funds unlocked):
   - Available withdrawal amount display
   - Amount input (up to withdrawal_limit)
   - Final amount preview
   - Earnings summary
   - Withdraw button with confirmation

5. **Earnings History Chart**:
   - Value over time (calculated from events)
   - APY trend
   - Profit/loss visualization

**Data Source**:

- Lender info: `get-lender-info` from contract
- Pool stats: `get-lending-pool-info` from contract
- Withdrawal limit: `get-withdrawal-limit` from contract
- Historical data: Blockchain events via Stacks API
- Cache in LocalStorage

**UI Components**:

- Pool statistics dashboard
- Deposit calculator with projections
- Active position summary card
- Unlock countdown timer
- Withdrawal form with validation
- Earnings chart (line graph)
- Transaction confirmation modals

**Dependencies**: Phase 2.4, 3.2, 3.3 completed

---

### 4.4 Credit Score Dashboard

**Status**: Not Started

**Files to Create**:

- `src/pages/CreditScorePage.tsx`
- `src/components/CreditScore/ScoreGauge.tsx`
- `src/components/CreditScore/TierProgressBar.tsx`
- `src/components/CreditScore/ComponentBreakdown.tsx`
- `src/components/CreditScore/HistoricalChart.tsx`
- `src/components/CreditScore/ImprovementTips.tsx`

**Features**:

1. **Credit Score Display**:
   - Large score number (0-1000)
   - Tier badge (0-5)
   - Circular progress gauge
   - Tier name and description

2. **Score Breakdown**:
   - Repayment Score: X / 700 points
     - Progress bar
     - Calculation explanation
     - "X on-time out of Y total loans"
   - Activity Score: X / 300 points
     - Progress bar
     - Calculation based on average balance
     - "Average balance: X sBTC"

3. **Tier Progression**:
   - Current tier badge
   - Next tier requirements
   - Points needed to reach next tier
   - Loan limit increase at next tier
   - Visual progress bar to next tier

4. **Historical Credit Score**:
   - Line chart showing score over time
   - Calculated from historical account data
   - Reconstruct from loan events
   - Major events marked (loans, repayments)
   - Trend indicator (improving/declining)

5. **Credit Score Simulator**:
   - "What if I repay my loan on time?"
   - "What if I take a loan of X?"
   - "What if I increase my balance to X?"
   - Show projected score and tier

6. **Improvement Tips**:
   - Actionable recommendations
   - "Repay loans on time to improve repayment score"
   - "Maintain higher balance to improve activity score"
   - "Complete 5 loans to maximize score accuracy"

**Data Source**:

- Current score: `get-loan-limit-info` from contract
- Account data: `get-borrower-info` from contract
- Historical calculation: From cached events
- Cache snapshots in LocalStorage

**UI Components**:

- Score gauge with animated progress
- Dual progress bars for repayment/activity
- Tier badge with visual flair
- Interactive simulator
- Historical chart
- Educational tooltips
- Tips and recommendations cards

**Dependencies**: Phase 2.1 completed

---

### 4.5 Pool Analytics Dashboard

**Status**: Not Started

**Files to Create**:

- `src/pages/PoolStatsPage.tsx`
- `src/components/Pool/UtilizationGauge.tsx`
- `src/components/Pool/APYChart.tsx`
- `src/components/Pool/HealthIndicator.tsx`
- `src/components/Pool/ActivityFeed.tsx`

**Features**:

1. **Pool Metrics Cards**:
   - Total Pool Size (sBTC)
   - Contract Balance (sBTC)
   - Active Loans Amount
   - Available Liquidity
   - Current APY
   - Utilization Ratio

2. **Utilization Visualization**:
   - Gauge showing % of pool in use
   - Visual breakdown: deposited, loaned, available
   - Color-coded (green: healthy, yellow: caution, red: high utilization)

3. **APY Performance Chart**:
   - Historical APY over time (from events)
   - 7-day, 30-day, 90-day views
   - Average APY indicator
   - Comparison to target APY

4. **Pool Health Indicator**:
   - Profit/Loss status
   - Risk assessment (based on utilization)
   - Outstanding loans summary
   - Default risk indicator

5. **Recent Activity Feed**:
   - Latest deposits, withdrawals, loans, repayments
   - Fetch recent events from Stacks API
   - Transaction amounts and addresses (truncated)
   - Time ago display
   - Auto-refresh every minute

6. **Lender Leaderboard** (optional):
   - Top depositors by amount (from events)
   - Longest time in pool
   - Highest earnings (estimated)

**Data Source**:

- Pool info: `get-lending-pool-info` from contract
- Recent activity: Latest contract events from Stacks API
- Historical metrics: Calculated from cached events
- Real-time updates via polling

**UI Components**:

- Metric cards with trend indicators
- Utilization gauge with segments
- Multi-line APY chart
- Health status badge
- Activity feed with icons
- Leaderboard table

**Dependencies**: Phase 2.4, 3.1 completed

---

## Phase 5: Data Management and Persistence

### 5.1 Blockchain Event Fetching Service

**Status**: Not Started

**Files to Create**:

- `src/services/blockchain/events.service.ts`
- `src/services/blockchain/event-parser.service.ts`
- `src/hooks/useContractEvents.ts`

**Functionality**:

1. **Event Types to Fetch**:
   - `lend_sucessful`: User deposited to pool
   - `withdrawal_sucessful`: User withdrew from pool
   - `loan_grant_sucessful`: Loan was granted
   - `loan_repaid_sucessfully`: Loan was repaid

2. **Fetching Strategy**:
   - Use Stacks Blockchain API: `/extended/v1/contract/{contract_id}/events`
   - Filter by event type (print events)
   - Pagination support for large result sets
   - Cache events in LocalStorage
   - Track last fetched block height

3. **Event Processing**:
   - Parse Clarity value from print event
   - Convert to TypeScript interfaces
   - Validate event data structure
   - Store in memory cache
   - Update LocalStorage

4. **Sync Strategy**:
   - On wallet connect: Fetch all user-related events
   - On new block: Fetch latest events
   - On page focus: Refresh if stale (> 5 minutes)
   - Manual refresh button
   - Background polling every 60 seconds

5. **Data Reconstruction**:
   - Build loan history from loan_grant + loan_repaid events
   - Build lender history from lend + withdrawal events
   - Calculate historical credit scores
   - Build APY timeline from pool state changes

**API Endpoints**:

```typescript
// Stacks API endpoints
const STACKS_API = 'https://api.testnet.hiro.so';
const CONTRACT_EVENTS = `${STACKS_API}/extended/v1/contract/${CONTRACT_ADDRESS}/events`;
const TX_STATUS = `${STACKS_API}/extended/v1/tx/${TX_ID}`;
```

**Dependencies**: Phase 1.3, 1.5 completed

---

### 5.2 Caching and State Management

**Status**: Not Started

**Files to Create**:

- `src/contexts/CacheContext.tsx`
- `src/contexts/DataContext.tsx`
- `src/hooks/useCache.ts`
- `src/utils/cache.utils.ts`

**Functionality**:

1. **Multi-Layer Caching Strategy**:

   ```typescript
   interface CacheLayer {
     memory: Map<string, CachedData>;      // Fastest, cleared on refresh
     session: SessionStorage;               // Per-session, cleared on close
     local: LocalStorage;                   // Persistent across sessions
   }
   
   interface CachedData {
     key: string;
     data: any;
     timestamp: number;
     ttl: number;
     source: 'contract' | 'events' | 'computed';
   }
   ```

2. **Cache Configurations**:

   ```typescript
   const CACHE_CONFIGS = {
     balance: { ttl: 30, layer: 'memory' },
     loanInfo: { ttl: 10, layer: 'memory' },
     poolStats: { ttl: 60, layer: 'memory' },
     creditScore: { ttl: 300, layer: 'local' },
     events: { ttl: 3600, layer: 'local' },
     userHistory: { ttl: 3600, layer: 'local' }
   };
   ```

3. **Cache Invalidation Rules**:
   - On transaction success: Clear related cache keys
   - On new block: Clear block-dependent cache
   - On wallet change: Clear all user-specific cache
   - Manual refresh: Clear all memory cache
   - Stale data: Auto-refresh in background

4. **Optimistic Updates**:
   - Update UI immediately on transaction submission
   - Store optimistic state separately
   - Rollback if transaction fails
   - Confirm with blockchain data on success

5. **Data Synchronization**:
   - Single source of truth: Blockchain contract
   - Cache is always treated as potentially stale
   - Stale-while-revalidate pattern
   - Show loading indicators during refresh

6. **React Context Structure**:

   ```typescript
   interface AppDataContext {
     // Contract data
     poolInfo: LendingPoolInfo | null;
     userLoanInfo: BorrowerInfo | null;
     userLenderInfo: LenderInfo | null;
     creditScore: LoanLimitInfo | null;
     
     // Derived data
     loanHistory: LoanGrantEvent[];
     lenderHistory: LendEvent[];
     
     // State
     loading: boolean;
     error: Error | null;
     lastUpdate: number;
     
     // Actions
     refresh: () => Promise<void>;
     invalidateCache: (keys: string[]) => void;
   }
   ```

**Dependencies**: Phase 1.5, 5.1 completed

---

### 5.3 Historical Data Reconstruction

**Status**: Not Started

**Files to Create**:

- `src/services/history/reconstruction.service.ts`
- `src/hooks/useHistoricalData.ts`

**Functionality**:

1. **Loan History Reconstruction**:
   - Fetch all `loan_grant_sucessful` events for user
   - Fetch all `loan_repaid_sucessfully` events for user
   - Match repayments to loans by timing
   - Determine if repayment was on-time or late
   - Build complete loan history with status

2. **Lender History Reconstruction**:
   - Fetch all `lend_sucessful` events for user
   - Fetch all `withdrawal_sucessful` events for user
   - Calculate time in pool for each deposit
   - Estimate earnings for each position
   - Build complete lender history

3. **Credit Score Timeline**:
   - For each past event, recalculate credit score at that time
   - Track score changes over time
   - Identify major events that changed score
   - Generate chart data points

4. **Pool Performance Timeline**:
   - Fetch all pool-related events
   - Reconstruct pool size at different points in time
   - Calculate historical APY
   - Generate performance metrics

5. **Caching Strategy**:
   - Cache reconstructed data in LocalStorage
   - Invalidate only when new events detected
   - Incremental updates (don't recalculate everything)

**Dependencies**: Phase 5.1 completed

---

## Phase 6: Advanced Features and Polish

### 6.1 Error Handling and User Feedback System

**Status**: Not Started

**Files to Create**:

- `src/services/errors/error-mapper.service.ts`
- `src/components/Error/ErrorBoundary.tsx`
- `src/components/Error/ErrorModal.tsx`
- `src/components/Feedback/Toast.tsx`
- `src/hooks/useToast.ts`

**Functionality**:

1. **Contract Error Mapping**:

   ```typescript
   const ERROR_MESSAGES = {
     [ContractError.ERR_NOT_ELIGIBLE]: {
       title: "Not Eligible for Loan",
       message: "You don't meet the requirements for this loan amount.",
       solutions: [
         "Check your credit score and tier",
         "Verify your 3-month average balance",
         "Try a smaller loan amount",
         "Ensure you don't have an active loan"
       ]
     },
     [ContractError.ERR_FUNDS_LOCKED]: {
       title: "Funds Still Locked",
       message: "Your funds are locked until the unlock block.",
       solutions: [
         "Check the unlock countdown timer",
         "Wait until the lock period expires",
         "Estimated unlock: [calculated date]"
       ]
     },
     [ContractError.ERR_POOL_SHARE_EXCEEDED]: {
       title: "Withdrawal Amount Too High",
       message: "You're trying to withdraw more than your share.",
       solutions: [
         "Check your available withdrawal limit",
         "Your pool share may have decreased due to losses",
         "Try withdrawing a smaller amount"
       ]
     },
     [ContractError.ERR_INPUT_VALUE_TOO_SMALL]: {
       title: "Amount Too Small",
       message: "The amount must meet minimum requirements.",
       solutions: [
         "Minimum deposit: 0.1 sBTC (10,000,000 sats)",
         "Minimum loan: Based on your tier",
         "Increase the amount"
       ]
     },
     [ContractError.ERR_FUNDS_NOT_AVAILABLE_NOW]: {
       title: "Pool Liquidity Insufficient",
       message: "The pool doesn't have enough funds for this loan.",
       solutions: [
         "Check available liquidity in pool stats",
         "Try a smaller loan amount",
         "Wait for withdrawals to complete or new deposits"
       ]
     },
     // ... map all error codes
   };
   ```

2. **Inline Validation**:
   - Show warnings before user submits
   - Disable buttons if action will fail
   - Show helpful hints for fixing issues
   - Real-time validation as user types

3. **Toast Notifications**:
   - Success: Green with checkmark icon
   - Error: Red with X icon
   - Warning: Yellow with exclamation icon
   - Info: Blue with info icon
   - Auto-dismiss after 5 seconds (configurable)
   - Stack multiple toasts

4. **Error Recovery**:
   - Retry button for failed transactions
   - Alternative actions suggested
   - Link to help documentation
   - Contact support option

**Dependencies**: Phase 1.3 completed

---

### 6.2 Accessibility Enhancements

**Status**: Not Started

**Files to Create**:

- `src/components/Accessibility/ScreenReaderAnnouncements.tsx`
- `src/hooks/useKeyboardShortcuts.ts`
- `src/hooks/useReducedMotion.ts`
- `src/utils/a11y.utils.ts`

**Functionality**:

1. **ARIA Labels and Roles**:
   - All interactive elements have descriptive labels
   - Form inputs have associated labels and descriptions
   - Buttons describe their action clearly
   - Links describe destination or action
   - Proper heading hierarchy (h1 -> h2 -> h3)

2. **Keyboard Navigation**:
   - Tab order is logical and intuitive
   - Enter/Space activate buttons and toggles
   - Escape closes modals and dropdowns
   - Arrow keys navigate lists and menus
   - Keyboard shortcuts:
     - `Ctrl+R` or `Cmd+R`: Refresh data
     - `Ctrl+K` or `Cmd+K`: Connect/disconnect wallet
     - `?`: Show keyboard shortcuts help

3. **Screen Reader Support**:
   - Announce transaction status changes
   - Announce balance updates
   - Announce credit score changes
   - Announce errors and warnings
   - Live regions for dynamic content
   - Descriptive labels for charts and graphs

4. **Visual Accessibility**:
   - Focus indicators on all interactive elements
   - Color is not the only indicator (use icons + text)
   - Sufficient color contrast (WCAG AA)
   - Text size respects user browser settings
   - Option for larger text mode

5. **Reduced Motion Support**:
   - Detect `prefers-reduced-motion` media query
   - Disable animations if preferred
   - Provide alternative visual feedback
   - Instant transitions instead of animations

**Dependencies**: All UI phases completed

---

### 6.3 Mobile Optimization

**Status**: Not Started

**Files to Update**:

- All component files with responsive classes
- Add mobile-specific components where needed

**Functionality**:

1. **Touch Optimization**:
   - Larger touch targets (min 44x44px)
   - Swipe gestures for navigation between pages
   - Pull-to-refresh on data views
   - Bottom sheet modals instead of center modals
   - No hover states (use press states)

2. **Mobile-Specific UI**:
   - Bottom navigation bar (fixed)
   - Collapsible sections to save space
   - Horizontal scrolling for charts and tables
   - Simplified data displays
   - Sticky headers for long pages

3. **Performance Optimization**:
   - Lazy load images and charts
   - Code splitting by route
   - Reduce bundle size
   - Optimize re-renders with React.memo
   - Debounce expensive operations

4. **Viewport Handling**:
   - Responsive breakpoints:
     - Mobile: < 640px (sm)
     - Tablet: 640-1024px (md, lg)
     - Desktop: > 1024px (xl, 2xl)
   - Test on various device sizes
   - Handle landscape/portrait orientation
   - Prevent zoom on input focus (font-size >= 16px)

5. **Mobile Wallet Integration**:
   - Optimize for mobile wallet apps
   - Deep linking support
   - QR code scanning (if needed)
   - Test on iOS and Android

**Dependencies**: Phase 4 completed

---

### 6.4 Educational Content and Onboarding

**Status**: Not Started

**Files to Create**:

- `src/components/Onboarding/WelcomeModal.tsx`
- `src/components/Onboarding/GuidedTour.tsx`
- `src/components/Help/TooltipWrapper.tsx`
- `src/components/Help/FAQSection.tsx`
- `src/pages/HowItWorksPage.tsx`

**Functionality**:

1. **First-Time User Experience**:
   - Welcome modal explaining Credora
   - Quick intro: "Borrow without collateral, lend to earn"
   - Guided tour of key features (optional)
   - "Connect wallet to get started" prompt
   - Skip tour option (save preference in LocalStorage)

2. **Contextual Tooltips**:
   - Info icons next to complex terms
   - Hover (desktop) or tap (mobile) to show
   - Explain credit score components
   - Explain tier system and limits
   - Explain APY calculation
   - Explain average balance concept
   - Explain block time and countdowns

3. **FAQ Section**:
   - **"What is a credit score?"**
     - Explanation of 700 + 300 system
     - How it's calculated
   - **"How is my loan limit determined?"**
     - Tier system explanation
     - Average balance requirement
   - **"What happens if I repay late?"**
     - Impact on credit score
     - Late loan counter increases
   - **"How do I earn interest as a lender?"**
     - Pool mechanics
     - APY calculation
   - **"When can I withdraw my funds?"**
     - Lock duration explanation
     - Unlock block countdown
   - **"What is average balance?"**
     - 3-month snapshot system
     - Why it matters for eligibility

4. **How It Works Page**:
   - Borrower flow diagram
     1. Connect wallet
     2. Build credit score (maintain balance)
     3. Apply for loan
     4. Receive sBTC
     5. Repay on time
   - Lender flow diagram
     1. Connect wallet
     2. Deposit sBTC
     3. Earn yield from loan interest
     4. Withdraw after lock period
   - Credit scoring explained (visual)
   - Pool mechanics explained (visual)
   - Risk disclosures

**Onboarding State Management**:

- Track onboarding completion in LocalStorage
- Track which tooltips user has seen
- Track FAQ items user has expanded
- Don't show repeated prompts

**Dependencies**: Phase 4 completed

---

## Phase 7: Testing and Quality Assurance

### 7.1 Contract Interaction Testing

**Status**: Not Started

**Files to Create**:

- `src/services/contract/__tests__/read.service.test.ts`
- `src/services/contract/__tests__/write.service.test.ts`
- `src/services/blockchain/__tests__/events.service.test.ts`

**Test Cases**:

1. **Read Functions**:
   - Test all read-only contract calls
   - Test error handling for failed calls
   - Test retry logic
   - Test caching behavior
   - Test data parsing and type conversion

2. **Write Functions**:
   - Test transaction building
   - Test signature flow (mock wallet)
   - Test pending state
   - Test success/failure handling
   - Test post-condition validation

3. **Events**:
   - Test event fetching from API
   - Test event parsing
   - Test event caching
   - Test incremental updates

**Dependencies**: Phase 1.3 completed

---

### 7.2 Business Logic Testing

**Status**: Not Started

**Files to Create**:

- `src/services/credit/__tests__/calculator.service.test.ts`
- `src/services/loan/__tests__/eligibility.service.test.ts`
- `src/services/pool/__tests__/analytics.service.test.ts`
- `src/utils/__tests__/block.utils.test.ts`

**Test Cases**:

1. **Credit Score Calculation**:
   - Test activity score at each tier threshold
   - Test repayment score with various loan histories
   - Test tier determination
   - Edge cases:
     - 0 loans (score = 0)
     - All on-time (score = 700 + activity)
     - All late (score = activity only)
     - New user bonus (< 5 loans)

2. **Loan Eligibility**:
   - Test eligibility rules
   - Test limit calculation (min of credit & balance)
   - Test validation logic
   - Edge cases:
     - Active loan exists (should reject)
     - Zero balance (should reject)
     - Very low credit score (tier 0 limits)

3. **Pool Analytics**:
   - Test APY calculation
   - Test utilization ratio
   - Test earnings projection
   - Test profit/loss determination
   - Edge cases:
     - Pool empty
     - Pool at full utilization
     - Negative profit (losses)

4. **Block Utilities**:
   - Test block to date conversion
   - Test days to blocks conversion
   - Test countdown calculations
   - Test past due detection

**Dependencies**: Phase 2 completed

---

### 7.3 UI Component Testing

**Status**: Not Started

**Files to Create**:

- Component test files for all major components
- Snapshot tests for visual regression

**Test Cases**:

1. **Component Rendering**:
   - Test all components render without errors
   - Test with various props
   - Test loading states
   - Test error states
   - Test empty states

2. **User Interactions**:
   - Test form submissions
   - Test button clicks
   - Test input validation
   - Test navigation
   - Test modal open/close

3. **Integration Tests**:
   - Test complete user flows
   - Test wallet connection flow
   - Test loan application flow
   - Test deposit/withdrawal flow
   - Mock contract calls

**Dependencies**: Phase 4 completed

---

### 7.4 End-to-End Testing (Manual)

**Status**: Not Started

**Test Scenarios**:

1. **Borrower Flow** (Testnet):
   - Connect Hiro wallet
   - Check credit score (should be low if new)
   - Request small loan (within tier 0 limit)
   - Confirm transaction in wallet
   - Verify loan appears as active
   - Wait for confirmation
   - Repay loan before due date
   - Verify credit score increased

2. **Lender Flow** (Testnet):
   - Connect wallet with testnet sBTC
   - Check pool stats
   - Deposit minimum amount (0.1 sBTC)
   - Confirm transaction
   - Verify position appears
   - Check unlock countdown
   - Wait for unlock (or test with short duration)
   - Withdraw funds
   - Verify earnings received

3. **Edge Cases**:
   - Try to borrow while having active loan (should fail)
   - Try to withdraw before unlock (should fail)
   - Try to borrow more than limit (should fail)
   - Late loan repayment (test credit score impact)
   - Insufficient pool liquidity (should fail gracefully)

4. **Error Scenarios**:
   - Network errors during transaction
   - User rejects transaction
   - Transaction fails on-chain
   - Verify error messages are helpful

**Dependencies**: Phase 4, 5, 6 completed

---

## Phase 8: Deployment and Monitoring

### 8.1 Production Build Optimization

**Status**: Not Started

**Tasks**:

1. **Bundle Optimization**:
   - Code splitting by route (lazy load pages)
   - Tree shaking (remove unused code)
   - Remove console.logs (use build flag)
   - Minify CSS and JS
   - Optimize images (use WebP where supported)
   - Analyze bundle size with `vite build --report`

2. **Performance Audit**:
   - Run Lighthouse audit
   - Target: 90+ performance score
   - Optimize Largest Contentful Paint (LCP < 2.5s)
   - Optimize First Input Delay (FID < 100ms)
   - Optimize Cumulative Layout Shift (CLS < 0.1)
   - Reduce Time to Interactive (TTI)

3. **Environment Configuration**:
   - Set up production environment variables
   - Consider Stacks mainnet contracts (future)
   - Set up error tracking (Sentry optional)
   - Set up analytics (optional)
   - Configure proper CSP headers

4. **Caching Strategy**:
   - Set proper HTTP cache headers
   - Cache static assets aggressively
   - Use service worker for offline support (optional)

**Dependencies**: All phases completed

---

### 8.2 Deployment Setup

**Status**: Not Started

**Tasks**:

1. **Hosting Platform** (Choose one):
   - **Vercel** (Recommended):
     - Zero-config deployment
     - Automatic HTTPS
     - Edge network CDN
     - Git integration
   - **Netlify**:
     - Similar features to Vercel
     - Good for static sites
   - **GitHub Pages**:
     - Free hosting
     - Direct from repository

2. **Deployment Steps**:
   - Build production bundle: `npm run build`
   - Test production build locally: `npm run preview`
   - Deploy to hosting platform
   - Configure custom domain (optional)
   - Set up SSL certificate (automatic)

3. **Continuous Integration** (Optional):
   - Set up GitHub Actions
   - Run tests on pull request
   - Run linting and type checking
   - Automated deployment on merge to main
   - Preview deployments for PRs

4. **Environment Variables**:
   - Configure on hosting platform
   - VITE_STACKS_NETWORK
   - VITE_SBTC_CONTRACT
   - VITE_CREDORA_CONTRACT
   - VITE_STACKS_API_URL

**Dependencies**: Phase 8.1 completed

---

### 8.3 Documentation

**Status**: Not Started

**Files to Create**:

- `README.md` - Project overview and setup
- `ARCHITECTURE.md` - Technical architecture
- `USER_GUIDE.md` - End-user documentation

**Content**:

1. **README.md**:
   - Project description
   - Features list
   - Tech stack
   - Prerequisites (Node.js, npm)
   - Setup instructions
   - Development commands
   - Build instructions
   - Deployment instructions
   - Contract addresses
   - License

2. **ARCHITECTURE.md**:
   - System overview diagram
   - Data flow (blockchain -> cache -> UI)
   - Component hierarchy
   - State management strategy
   - Caching layers
   - Event fetching strategy
   - Contract interaction patterns

3. **USER_GUIDE.md**:
   - How to get testnet sBTC
   - How to connect wallet (Hiro, Leather)
   - How to borrow (step-by-step)
   - How to lend (step-by-step)
   - Understanding credit scores
   - Understanding tiers
   - Understanding pool mechanics
   - FAQ
   - Troubleshooting

**Dependencies**: All phases completed

---

## Progress Tracking

### Completion Status Legend

- ✅ **Complete**: Fully implemented and tested
- 🚧 **In Progress**: Currently being worked on
- ⏸️ **Blocked**: Waiting on dependencies
- ⏳ **Planned**: Ready to start
- ❌ **Not Started**: Not yet begun

---

## Phase Summary

| Phase | Status  | Priority |
|-------|-------  |----------|
| Phase 1: Foundation (1.1-1.5) | ❌ Not Started | CRITICAL |
| Phase 2: Business Logic (2.1-2.4) | ❌ Not Started | CRITICAL |
| Phase 3: Blockchain (3.1-3.3) | ❌ Not Started | HIGH |
| Phase 4: UI Development (4.1-4.5) | ❌ Not Started | HIGH |
| Phase 5: Data Management (5.1-5.3) | ❌ Not Started | HIGH |
| Phase 6: Advanced Features (6.1-6.4) | ❌ Not Started | MEDIUM |
| Phase 7: Testing (7.1-7.4) | ❌ Not Started | HIGH |
| Phase 8: Deployment (8.1-8.3) | ❌ Not Started | MEDIUM |

**Total Estimated Effort**

---

## Critical Path

To ensure efficient development, follow this sequence:

1. **Week 1**: Phase 1 (Foundation) → Phase 2 (Business Logic)
2. **Week 2**: Phase 3 (Blockchain) → Phase 4 (UI Development)
3. **Week 3**: Phase 5 (Data Management) → Phase 6 (Advanced Features)
4. **Week 4**: Phase 7 (Testing) → Phase 8 (Deployment)

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Stacks Blockchain                      │
│  ┌──────────────────┐    ┌──────────────────┐          │
│  │  Credora Smart   │    │  sBTC Token      │          │
│  │  Contract        │    │  Contract        │          │
│  └──────────────────┘    └──────────────────┘          │
└─────────────┬─────────────────────┬─────────────────────┘
              │                     │
              │ Read/Write          │ Events
              ↓                     ↓
┌─────────────────────────────────────────────────────────┐
│           Stacks Blockchain API                          │
│  - Contract calls                                        │
│  - Event queries                                         │
│  - Transaction status                                    │
└─────────────┬───────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────┐
│              Frontend Application                        │
│                                                          │
│  ┌────────────────────────────────────────────┐         │
│  │         Memory Cache (React Context)       │         │
│  │  - Current block height                    │         │
│  │  - User balances                           │         │
│  │  - Active loans/positions                  │         │
│  └────────────────────────────────────────────┘         │
│                      ↕                                   │
│  ┌────────────────────────────────────────────┐         │
│  │       LocalStorage (Persistent Cache)      │         │
│  │  - Historical events                       │         │
│  │  - Reconstructed history                   │         │
│  │  - User preferences                        │         │
│  │  - Pending transactions                    │         │
│  └────────────────────────────────────────────┘         │
│                      ↕                                   │
│  ┌────────────────────────────────────────────┐         │
│  │              UI Components                 │         │
│  │  - Dashboard                               │         │
│  │  - Borrow/Lend pages                       │         │
│  │  - Credit score                            │         │
│  │  - Pool analytics                          │         │
│  └────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

---

## Next Steps

**Immediate Actions** (Start Here):

1. ✅ Install Stacks-related npm packages (Phase 1.1)
2. ✅ Create contract type definitions (Phase 1.2)
3. ✅ Build local storage management system (Phase 1.5)
4. ✅ Build base contract interaction service (Phase 1.3)
5. ✅ Enhance wallet integration (Phase 1.4)

Once Phase 1 is complete, you'll have a solid foundation to build all other features.

---

## Important Notes

**Contract Specifics**:

- All monetary values in satoshis (8 decimals)
- Minimum deposit: 10,000,000 satoshis (0.1 BTC)
- Block time: 10 minutes (600 seconds)
- Credit score: 0-1000 (700 repayment + 300 activity)
- Average balance: 3 snapshots (1, 31, 61 days ago)
- Interest calculation: `amount + (amount * rate / 100)`
- Lender pool share: `(lender_balance * contract_balance) / pool_size`

**Key Contract Functions**:

- **Read**: `get-loan-limit-info`, `get-borrower-info`, `get-lender-info`, `get-lending-pool-info`, `get-loan-eligibility-info`, `repayment-amount-due`, `get-withdrawal-limit`, `get-block-height`
- **Write**: `lend`, `withdraw`, `apply-for-loan`, `repay-loan`
- **Events**: `lend_sucessful`, `withdrawal_sucessful`, `loan_grant_sucessful`, `loan_repaid_sucessfully`

**Data Sources**:

1. **Primary**: Contract read-only calls (always fresh)
2. **Historical**: Stacks Blockchain API events
3. **Cache**: LocalStorage with TTL
4. **Computed**: Derived from contract data + events

**Design Principles**:

- Blockchain is source of truth
- Cache for performance, not persistence
- Show stale data with loading indicator
- Real-time updates via block polling
- Graceful degradation if API unavailable
- Mobile-first responsive design
- Accessibility as priority
- Educational and user-friendly

---

End of Implementation Plan
