import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { lendToPool, withdrawFromPool, getLenderInfo, getLendingPoolInfo } from '../lib/contract';
import toast from 'react-hot-toast';

export function LenderDashboard() {
  const { userSession, isConnected, walletAddress } = useWallet();
  const [lendAmount, setLendAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [lenderInfo, setLenderInfo] = useState<any>(null);
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      loadData();
    }
  }, [walletAddress]);

  const loadData = async () => {
    if (!walletAddress) return;

    const [lender, pool] = await Promise.all([
      getLenderInfo(walletAddress),
      getLendingPoolInfo(),
    ]);

    setLenderInfo(lender);
    setPoolInfo(pool);
  };

  const handleLend = async () => {
    if (!lendAmount || parseFloat(lendAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amountInSatoshis = Math.floor(parseFloat(lendAmount) * 100000000);

    if (amountInSatoshis < 10000000) {
      toast.error('Minimum deposit is 0.1 sBTC');
      return;
    }

    setLoading(true);
    try {
      await lendToPool(
        userSession,
        amountInSatoshis,
        () => {
          toast.success('Deposit successful!');
          setLendAmount('');
          loadData();
          setLoading(false);
        },
        () => {
          toast.error('Transaction cancelled');
          setLoading(false);
        }
      );
    } catch (error) {
      toast.error('Failed to deposit');
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amountInSatoshis = Math.floor(parseFloat(withdrawAmount) * 100000000);

    setLoading(true);
    try {
      await withdrawFromPool(
        userSession,
        amountInSatoshis,
        () => {
          toast.success('Withdrawal successful!');
          setWithdrawAmount('');
          loadData();
          setLoading(false);
        },
        () => {
          toast.error('Transaction cancelled');
          setLoading(false);
        }
      );
    } catch (error) {
      toast.error('Failed to withdraw');
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-slate-400">Connect your wallet to access the lender dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Lender Dashboard</h2>
        <p className="text-slate-400">Deposit sBTC to earn interest from borrowers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Your Balance"
          value={lenderInfo ? `${(lenderInfo.balance / 100000000).toFixed(4)} sBTC` : '0 sBTC'}
        />
        <StatCard
          label="Pool Balance"
          value={lenderInfo ? `${(lenderInfo.lender_pool_balance / 100000000).toFixed(4)} sBTC` : '0 sBTC'}
          subValue="With earned interest"
        />
        <StatCard
          label="Total Pool Size"
          value={poolInfo ? `${(poolInfo.pool_size / 100000000).toFixed(2)} sBTC` : '0 sBTC'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Deposit sBTC">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Amount (sBTC)</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={lendAmount}
                onChange={(e) => setLendAmount(e.target.value)}
                placeholder="0.1"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-1">Minimum: 0.1 sBTC</p>
            </div>
            <button
              onClick={handleLend}
              disabled={loading || !lendAmount}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Processing...' : 'Deposit'}
            </button>
          </div>
        </Card>

        <Card title="Withdraw sBTC">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Amount (sBTC)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-1">
                Available: {lenderInfo ? (lenderInfo.lender_pool_balance / 100000000).toFixed(4) : '0'} sBTC
              </p>
            </div>
            <button
              onClick={handleWithdraw}
              disabled={loading || !withdrawAmount}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Processing...' : 'Withdraw'}
            </button>
          </div>
        </Card>
      </div>

      {lenderInfo && lenderInfo.unlock_block > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Lock Status</p>
              <p className="text-white font-medium">
                {lenderInfo.unlock_block > Date.now() / 1000
                  ? `Locked until block ${lenderInfo.unlock_block}`
                  : 'Unlocked'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Time in Pool</p>
              <p className="text-white font-medium">
                {Math.floor(lenderInfo.time_in_pool_in_seconds / 86400)} days
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
