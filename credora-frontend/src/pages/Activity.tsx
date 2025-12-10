import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { TransactionHistoryTable } from '@/components/TransactionHistoryTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionFilters, TransactionType, TransactionStatus, DateRange } from '@/components/activity/TransactionFilters';
import { TransactionCard } from '@/components/activity/TransactionCard';
import { TransactionPagination } from '@/components/activity/TransactionPagination';
import { ActivityStats } from '@/components/activity/ActivityStats';
import { Transaction } from '@/types/credora.types';
import { Activity as ActivityIcon, Loader2, Wallet } from 'lucide-react';
import { useWalletStore } from '@/stores/walletStore';
import { useNavigate } from 'react-router-dom';
import { subDays, isAfter } from 'date-fns';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';
import { formatSBTC } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// Remove mock data - using real blockchain data now
const mockTransactions: Transaction[] = [
  { id: '1', type: 'deposit', amount: '0.005', status: 'completed', timestamp: Date.now() - 86400000, txHash: '0x1234567890abcdef1234567890abcdef12345678' },
  { id: '2', type: 'borrow', amount: '0.003', status: 'completed', timestamp: Date.now() - 172800000, txHash: '0xabcdef1234567890abcdef1234567890abcdef12' },
  { id: '3', type: 'repay', amount: '0.0032', status: 'completed', timestamp: Date.now() - 259200000, txHash: '0x567890abcdef1234567890abcdef123456789012' },
  { id: '4', type: 'deposit', amount: '0.010', status: 'completed', timestamp: Date.now() - 345600000, txHash: '0x890abcdef1234567890abcdef12345678901234' },
  { id: '5', type: 'withdraw', amount: '0.002', status: 'pending', timestamp: Date.now() - 432000000, txHash: '0xcdef1234567890abcdef1234567890abcdef1234' },
  { id: '6', type: 'borrow', amount: '0.005', status: 'completed', timestamp: Date.now() - 518400000, txHash: '0xef1234567890abcdef1234567890abcdef123456' },
  { id: '7', type: 'deposit', amount: '0.008', status: 'completed', timestamp: Date.now() - 604800000, txHash: '0x234567890abcdef1234567890abcdef1234567890' },
  { id: '8', type: 'repay', amount: '0.0053', status: 'completed', timestamp: Date.now() - 691200000, txHash: '0x4567890abcdef1234567890abcdef123456789012' },
  { id: '9', type: 'withdraw', amount: '0.003', status: 'failed', timestamp: Date.now() - 777600000, txHash: '0x67890abcdef1234567890abcdef12345678901234' },
  { id: '10', type: 'deposit', amount: '0.002', status: 'completed', timestamp: Date.now() - 864000000, txHash: '0x0abcdef1234567890abcdef1234567890abcdef12' },
  { id: '11', type: 'borrow', amount: '0.004', status: 'completed', timestamp: Date.now() - 950400000, txHash: '0x2345678901234567890abcdef1234567890abcdef' },
  { id: '12', type: 'repay', amount: '0.0042', status: 'pending', timestamp: Date.now() - 1036800000, txHash: '0x456789012345678901234567890abcdef12345678' },
];

export default function Activity() {
  const { isWalletConnected, address } = useWalletStore();
  const navigate = useNavigate();
  
  // Fetch real transaction history
  const { data: blockchainTransactions = [], isLoading } = useTransactionHistory(address);

  // Convert blockchain transactions to UI format
  const transactions: Transaction[] = useMemo(() => {
    return blockchainTransactions.map(tx => {
      // Map blockchain status to UI status
      let uiStatus: 'completed' | 'pending' | 'failed' = 'pending';
      if (tx.status === 'success') uiStatus = 'completed';
      else if (tx.status === 'failed') uiStatus = 'failed';
      
      return {
        id: tx.id,
        type: tx.type,
        amount: formatSBTC(tx.amount),
        status: uiStatus,
        timestamp: tx.timestamp * 1000, // Convert to milliseconds
        txHash: tx.txId,
      };
    });
  }, [blockchainTransactions]);

  // Filter states
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType>('all');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const hasActiveFilters = search !== '' || typeFilter !== 'all' || statusFilter !== 'all' || dateRange !== 'all';

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
    setDateRange('all');
    setCurrentPage(1);
  };

  // Filter and search transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          tx.id.toLowerCase().includes(searchLower) ||
          tx.amount.includes(search) ||
          tx.txHash?.toLowerCase().includes(searchLower) ||
          tx.type.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;

      // Date range filter
      if (dateRange !== 'all') {
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        const cutoffDate = subDays(new Date(), days);
        if (!isAfter(new Date(tx.timestamp), cutoffDate)) return false;
      }

      return true;
    });
  }, [search, typeFilter, statusFilter, dateRange]);

  // Paginate transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(startIndex, startIndex + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize);

  // Calculate stats
  const stats = useMemo(() => {
    const deposits = transactions.filter(tx => tx.type === 'deposit' && (tx.status === 'completed' || tx.status === 'success'));
    const borrows = transactions.filter(tx => tx.type === 'borrow' && (tx.status === 'completed' || tx.status === 'success'));
    const repays = transactions.filter(tx => tx.type === 'repay' && (tx.status === 'completed' || tx.status === 'success'));
    
    const totalDeposited = deposits.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
    const totalBorrowed = borrows.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
    
    return {
      totalTransactions: transactions.length,
      totalDeposited: `${totalDeposited.toFixed(4)} sBTC`,
      totalBorrowed: `${totalBorrowed.toFixed(4)} sBTC`,
      completedLoans: repays.length,
      totalLoans: borrows.length,
    };
  }, [transactions]);

  // Reset to first page when filters change
  const handleFilterChange = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto p-6 space-y-8">
        <div className="text-center space-y-4 py-8">
          <h1 className="text-5xl font-bold gradient-text">
            My Activity
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Track all your lending and borrowing transactions in one place
          </p>
        </div>

        {!isWalletConnected ? (
          <Card className="glass border-border/50">
            <CardContent className="p-0">
              <EmptyState
                icon={ActivityIcon}
                title="Connect Your Wallet"
                description="Connect your Stacks wallet to view your transaction history"
              />
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
              <Wallet className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">No Transactions Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start lending or borrowing to see your transaction history here
            </p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <ActivityStats {...stats} />

            {/* Transaction History Table */}
            <TransactionHistoryTable showHeader={true} />
          </>
        )}
      </main>
    </div>
  );
}
