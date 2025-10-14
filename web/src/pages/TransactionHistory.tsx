import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { Card } from '../components/Card';
import { supabase, type Transaction } from '../lib/supabase';

export function TransactionHistory() {
  const { isConnected, walletAddress } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (walletAddress) {
      loadTransactions();
    }
  }, [walletAddress]);

  const loadTransactions = async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'lend':
        return 'text-blue-400';
      case 'withdraw':
        return 'text-cyan-400';
      case 'borrow':
        return 'text-green-400';
      case 'repay':
        return 'text-yellow-400';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      completed: 'bg-green-500/20 text-green-400',
      failed: 'bg-red-500/20 text-red-400',
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          colors[status as keyof typeof colors] || 'bg-slate-500/20 text-slate-400'
        }`}
      >
        {status}
      </span>
    );
  };

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-slate-400">Connect your wallet to view transaction history</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Transaction History</h2>
        <p className="text-slate-400">Your complete transaction history on Credora</p>
      </div>

      <Card>
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-slate-400 mt-2">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400">No transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-sm text-slate-300">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-sm font-medium capitalize ${getTransactionTypeColor(
                          tx.transaction_type
                        )}`}
                      >
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-white font-medium">
                      {(tx.amount / 100000000).toFixed(4)} sBTC
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(tx.status)}</td>
                    <td className="py-3 px-4 text-sm text-slate-400">
                      {tx.transaction_hash ? (
                        <a
                          href={`https://explorer.stacks.co/txid/${tx.transaction_hash}?chain=testnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-400 transition-colors"
                        >
                          {tx.transaction_hash.slice(0, 8)}...
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
