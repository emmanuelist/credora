import { format } from 'date-fns';
import { 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/types/credora.types';
import { useState } from 'react';

interface TransactionCardProps {
  transaction: Transaction;
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          label: 'Completed',
          className: 'bg-success/10 text-success border-success/20',
        };
      case 'pending':
        return {
          icon: Clock,
          label: 'Pending',
          className: 'bg-warning/10 text-warning border-warning/20',
        };
      case 'failed':
        return {
          icon: XCircle,
          label: 'Failed',
          className: 'bg-destructive/10 text-destructive border-destructive/20',
        };
      default:
        return {
          icon: Clock,
          label: 'Unknown',
          className: 'bg-muted text-muted-foreground',
        };
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'deposit':
        return {
          icon: ArrowDownLeft,
          label: 'Deposit',
          color: 'text-success',
          bgColor: 'bg-success/10',
          description: 'Added to lending pool',
        };
      case 'withdraw':
        return {
          icon: ArrowUpRight,
          label: 'Withdraw',
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          description: 'Withdrawn from pool',
        };
      case 'borrow':
        return {
          icon: TrendingUp,
          label: 'Borrow',
          color: 'text-accent',
          bgColor: 'bg-accent/10',
          description: 'Loan received',
        };
      case 'repay':
        return {
          icon: TrendingDown,
          label: 'Repay',
          color: 'text-success',
          bgColor: 'bg-success/10',
          description: 'Loan repayment',
        };
      default:
        return {
          icon: Clock,
          label: 'Unknown',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          description: 'Unknown transaction',
        };
    }
  };

  const statusConfig = getStatusConfig(transaction.status);
  const typeConfig = getTypeConfig(transaction.type);
  const StatusIcon = statusConfig.icon;
  const TypeIcon = typeConfig.icon;

  const truncateHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  return (
    <Card className="glass border-border/50 hover:border-primary/30 transition-all duration-300 group">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Type Icon & Info */}
          <div className="flex items-center gap-4 flex-1">
            <div className={`p-3 rounded-xl ${typeConfig.bgColor} transition-transform group-hover:scale-110`}>
              <TypeIcon className={`w-6 h-6 ${typeConfig.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground">{typeConfig.label}</span>
                <Badge variant="outline" className={statusConfig.className}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{typeConfig.description}</p>
            </div>
          </div>

          {/* Amount */}
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-xl font-bold font-mono">
              {transaction.type === 'deposit' || transaction.type === 'borrow' ? '+' : '-'}
              {transaction.amount} sBTC
            </span>
            <span className="text-sm text-muted-foreground">
              {format(transaction.timestamp, 'MMM dd, yyyy • HH:mm')}
            </span>
          </div>
        </div>

        {/* Transaction Details */}
        {transaction.txHash && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Transaction ID:</span>
                <code className="px-2 py-1 rounded bg-muted/50 font-mono text-xs">
                  {truncateHash(transaction.txHash)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(transaction.txHash!)}
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                asChild
              >
                <a
                  href={`https://explorer.hiro.so/txid/${transaction.txHash}?chain=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Explorer
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
