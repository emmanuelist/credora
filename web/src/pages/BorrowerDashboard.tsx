import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import {
  applyForLoan,
  repayLoan,
  getBorrowerInfo,
  getLoanEligibilityInfo,
  getLoanLimitInfo,
} from '../lib/contract';
import toast from 'react-hot-toast';

export function BorrowerDashboard() {
  const { userSession, isConnected, walletAddress } = useWallet();
  const [loanAmount, setLoanAmount] = useState('');
  const [borrowerInfo, setBorrowerInfo] = useState<any>(null);
  const [eligibilityInfo, setEligibilityInfo] = useState<any>(null);
  const [loanLimitInfo, setLoanLimitInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      loadData();
    }
  }, [walletAddress]);

  const loadData = async () => {
    if (!walletAddress) return;

    const [borrower, eligibility, loanLimit] = await Promise.all([
      getBorrowerInfo(walletAddress),
      getLoanEligibilityInfo(walletAddress),
      getLoanLimitInfo(walletAddress),
    ]);

    setBorrowerInfo(borrower);
    setEligibilityInfo(eligibility);
    setLoanLimitInfo(loanLimit);
  };

  const handleApplyLoan = async () => {
    if (!loanAmount || parseFloat(loanAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amountInSatoshis = Math.floor(parseFloat(loanAmount) * 100000000);

    setLoading(true);
    try {
      await applyForLoan(
        userSession,
        amountInSatoshis,
        () => {
          toast.success('Loan approved!');
          setLoanAmount('');
          loadData();
          setLoading(false);
        },
        () => {
          toast.error('Transaction cancelled');
          setLoading(false);
        }
      );
    } catch (error) {
      toast.error('Failed to apply for loan');
      setLoading(false);
    }
  };

  const handleRepayLoan = async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      await repayLoan(
        userSession,
        walletAddress,
        () => {
          toast.success('Loan repaid successfully!');
          loadData();
          setLoading(false);
        },
        () => {
          toast.error('Transaction cancelled');
          setLoading(false);
        }
      );
    } catch (error) {
      toast.error('Failed to repay loan');
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-slate-400">Connect your wallet to access the borrower dashboard</p>
      </div>
    );
  }

  const hasActiveLoan = borrowerInfo?.active_loan?.amount > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Borrower Dashboard</h2>
        <p className="text-slate-400">Apply for uncollateralized loans based on your credit score</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          label="Credit Score"
          value={loanLimitInfo ? loanLimitInfo.credit_score : '0'}
          subValue="Out of 1000"
        />
        <StatCard
          label="Loan Limit"
          value={
            eligibilityInfo
              ? `${(eligibilityInfo.loan_limit / 100000000).toFixed(4)} sBTC`
              : '0 sBTC'
          }
        />
        <StatCard
          label="Total Loans"
          value={borrowerInfo?.account_data?.total_loans || 0}
        />
        <StatCard
          label="On-Time Rate"
          value={
            borrowerInfo?.account_data?.total_loans > 0
              ? `${Math.round(
                  (borrowerInfo.account_data.on_time_loans /
                    borrowerInfo.account_data.total_loans) *
                    100
                )}%`
              : 'N/A'
          }
        />
      </div>

      {loanLimitInfo && (
        <Card title="Credit Score Breakdown">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-400">Activity Score</p>
              <p className="text-2xl font-bold text-white">
                {loanLimitInfo.credit_score - loanLimitInfo.credit_score}
              </p>
              <p className="text-xs text-slate-500">Max 300 pts</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Repayment Score</p>
              <p className="text-2xl font-bold text-white">
                {loanLimitInfo.credit_score}
              </p>
              <p className="text-xs text-slate-500">Max 700 pts</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Average Balance</p>
              <p className="text-2xl font-bold text-white">
                {(loanLimitInfo.average_balance / 100000000).toFixed(4)}
              </p>
              <p className="text-xs text-slate-500">sBTC (3-month avg)</p>
            </div>
          </div>
        </Card>
      )}

      {hasActiveLoan ? (
        <Card title="Active Loan">
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-slate-400">Loan Amount</p>
                <p className="text-lg font-bold text-white">
                  {(borrowerInfo.active_loan.amount / 100000000).toFixed(4)} sBTC
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Interest Rate</p>
                <p className="text-lg font-bold text-white">
                  {borrowerInfo.active_loan.interest_rate}%
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Due Block</p>
                <p className="text-lg font-bold text-white">
                  {borrowerInfo.active_loan.due_block}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Amount Due</p>
                <p className="text-lg font-bold text-white">
                  {(borrowerInfo.repayment_amount_due / 100000000).toFixed(4)} sBTC
                </p>
              </div>
            </div>
            <button
              onClick={handleRepayLoan}
              disabled={loading}
              className="w-full md:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Processing...' : 'Repay Loan'}
            </button>
          </div>
        </Card>
      ) : (
        <Card title="Apply for Loan">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Loan Amount (sBTC)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-1">
                Your limit:{' '}
                {eligibilityInfo ? (eligibilityInfo.loan_limit / 100000000).toFixed(4) : '0'} sBTC
              </p>
            </div>

            {eligibilityInfo && (
              <div className="bg-slate-900 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Interest Rate</span>
                  <span className="text-white">{eligibilityInfo.interest_rate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Loan Duration</span>
                  <span className="text-white">{eligibilityInfo.duration} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Status</span>
                  <span
                    className={
                      eligibilityInfo.message === 'eligible for loan'
                        ? 'text-green-400'
                        : 'text-red-400'
                    }
                  >
                    {eligibilityInfo.message}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleApplyLoan}
              disabled={loading || !loanAmount || eligibilityInfo?.loan_limit === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Processing...' : 'Apply for Loan'}
            </button>
          </div>
        </Card>
      )}

      {borrowerInfo?.account_data && (
        <Card title="Loan History">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-400">Total Loans</p>
              <p className="text-2xl font-bold text-white">
                {borrowerInfo.account_data.total_loans}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">On-Time Repayments</p>
              <p className="text-2xl font-bold text-green-400">
                {borrowerInfo.account_data.on_time_loans}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Late Repayments</p>
              <p className="text-2xl font-bold text-red-400">
                {borrowerInfo.account_data.late_loans}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
