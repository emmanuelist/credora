import { z } from 'zod';

// Minimum and maximum sBTC amounts (matching smart contract requirements)
const MIN_DEPOSIT_AMOUNT = 0.1; // Contract requires 10,000,000 satoshis = 0.1 sBTC
const MIN_WITHDRAW_AMOUNT = 0.0001; // Smaller withdrawals allowed
const MIN_LOAN_AMOUNT = 0.0001; // Smaller loans allowed
const MAX_AMOUNT = 100;

export const depositSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(parseFloat(val)), 'Must be a valid number')
    .refine((val) => parseFloat(val) >= MIN_DEPOSIT_AMOUNT, `Minimum deposit is ${MIN_DEPOSIT_AMOUNT} sBTC`)
    .refine((val) => parseFloat(val) <= MAX_AMOUNT, `Maximum deposit is ${MAX_AMOUNT} sBTC`),
});

export const withdrawSchema = (maxBalance: number, isLocked: boolean) =>
  z.object({
    amount: z
      .string()
      .min(1, 'Amount is required')
      .refine((val) => !isNaN(parseFloat(val)), 'Must be a valid number')
      .refine((val) => parseFloat(val) >= MIN_WITHDRAW_AMOUNT, `Minimum withdrawal is ${MIN_WITHDRAW_AMOUNT} sBTC`)
      .refine((val) => parseFloat(val) <= maxBalance, `Cannot exceed your balance of ${maxBalance.toFixed(4)} sBTC`)
      .refine(() => !isLocked, 'Funds are still locked'),
  });

export const loanSchema = (maxLoan: number) =>
  z.object({
    amount: z
      .string()
      .min(1, 'Loan amount is required')
      .refine((val) => !isNaN(parseFloat(val)), 'Must be a valid number')
      .refine((val) => parseFloat(val) >= MIN_LOAN_AMOUNT, `Minimum loan is ${MIN_LOAN_AMOUNT} sBTC`)
      .refine((val) => parseFloat(val) <= maxLoan, `Cannot exceed your credit limit of ${maxLoan.toFixed(4)} sBTC`),
  });

// Validate deposit against available balance
export const validateDeposit = (amount: string, availableBalance: number): string | null => {
  if (!amount || amount.trim() === '') return null; // No error for empty - will show required on submit
  
  const value = parseFloat(amount);
  
  if (isNaN(value)) return 'Please enter a valid number';
  if (value < MIN_DEPOSIT_AMOUNT) return `Minimum deposit is ${MIN_DEPOSIT_AMOUNT} sBTC`;
  if (value > MAX_AMOUNT) return `Maximum deposit is ${MAX_AMOUNT} sBTC`;
  if (value > availableBalance) return `Insufficient balance. Available: ${availableBalance.toFixed(4)} sBTC`;
  
  return null;
};

// Validate withdrawal
export const validateWithdraw = (amount: string, poolBalance: number, isLocked: boolean): string | null => {
  if (!amount || amount.trim() === '') return null;
  
  if (isLocked) return 'Your funds are still locked';
  
  const value = parseFloat(amount);
  
  if (isNaN(value)) return 'Please enter a valid number';
  if (value < MIN_WITHDRAW_AMOUNT) return `Minimum withdrawal is ${MIN_WITHDRAW_AMOUNT} sBTC`;
  if (value > poolBalance) return `Cannot exceed your pool balance of ${poolBalance.toFixed(4)} sBTC`;
  
  return null;
};

// Validate loan amount
export const validateLoan = (amount: string, maxLoan: number, hasActiveLoan: boolean): string | null => {
  if (!amount || amount.trim() === '') return null;
  
  if (hasActiveLoan) return 'You already have an active loan';
  
  const value = parseFloat(amount);
  
  if (isNaN(value)) return 'Please enter a valid number';
  if (value < MIN_LOAN_AMOUNT) return `Minimum loan is ${MIN_LOAN_AMOUNT} sBTC`;
  if (value > maxLoan) return `Cannot exceed your credit limit of ${maxLoan.toFixed(4)} sBTC`;
  
  return null;
};

export type DepositFormData = z.infer<typeof depositSchema>;
export type LoanFormData = z.infer<ReturnType<typeof loanSchema>>;
