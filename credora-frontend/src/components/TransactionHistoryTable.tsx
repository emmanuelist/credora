import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransactionHistory, type Transaction } from '@/hooks/useTransactionHistory';
import { formatSBTC, formatUSD, sbtcToUSD } from '@/lib/utils';
import { useBTCPrice } from '@/hooks/useBTCPrice';
import { ArrowDownLeft, ArrowUpRight, Coins, Clock, CheckCircle2, XCircle, ExternalLink, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface TransactionHistoryTableProps {
  showHeader?: boolean;
  limit?: number;
}

export function TransactionHistoryTable({ showHeader = true, limit }: TransactionHistoryTableProps) {
  const { data: transactions, isLoading } = useTransactionHistory();
  const { data: btcPrice = 100000 } = useBTCPrice();
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdraw' | 'borrow' | 'repay'>('all');

  // Filter transactions
  const filteredTransactions = filter === 'all'
    ? transactions
    : transactions?.filter(tx => tx.type === filter);

  // Limit if specified
  const displayTransactions = limit 
    ? filteredTransactions?.slice(0, limit)
    : filteredTransactions;

  // Get icon based on transaction type
  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4 text-success" />;
      case 'withdraw':
        return <ArrowUpRight className="w-4 h-4 text-warning" />;
      case 'borrow':
        return <Coins className="w-4 h-4 text-accent" />;
      case 'repay':
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
    }
  };

  // Get badge variant based on status
  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="outline" className="border-success text-success">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="border-destructive text-destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-muted text-muted-foreground">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  // Get type label
  const getTypeLabel = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return 'Deposit';
      case 'withdraw':
        return 'Withdrawal';
      case 'borrow':
        return 'Loan';
      case 'repay':
        return 'Repayment';
    }
  };

  if (isLoading) {
    return (
      <Card className="glass border-border/50">
        {showHeader && (
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Your recent activity on Credora Protocol</CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card className="glass border-border/50">
        {showHeader && (
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Your recent activity on Credora Protocol</CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
            <p className="text-sm text-muted-foreground">
              Your transaction history will appear here once you start using the protocol
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50">
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Your recent activity on Credora Protocol</CardDescription>
            </div>
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="deposit">Deposits</SelectItem>
                <SelectItem value="withdraw">Withdrawals</SelectItem>
                <SelectItem value="borrow">Loans</SelectItem>
                <SelectItem value="repay">Repayments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      )}
      <CardContent>
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayTransactions?.map((tx) => (
                <TableRow key={tx.txId} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {getTypeIcon(tx.type)}
                      </div>
                      <div>
                        <div className="font-medium">{getTypeLabel(tx.type)}</div>
                        <div className="text-xs text-muted-foreground">
                          Block #{tx.blockHeight.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{formatSBTC(tx.amount)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatUSD(sbtcToUSD(tx.amount, btcPrice))}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(tx.status)}</TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">
                        {format(new Date(tx.timestamp * 1000), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(tx.timestamp * 1000), 'h:mm a')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://explorer.hiro.so/txid/${tx.txId}?chain=testnet`, '_blank')}
                    >
                      View
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {limit && transactions && transactions.length > limit && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              View All {transactions.length} Transactions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
