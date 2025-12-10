import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { formatSBTC, formatUSD, sbtcToUSD } from '@/lib/utils';

interface WithdrawTestCardProps {
  poolBalance: bigint;
  earnings: bigint;
  isLocked: boolean;
  unlockBlock: number;
  btcPrice: number;
  onWithdraw: (amount: bigint) => void;
  isPending: boolean;
}

export function WithdrawTestCard({
  poolBalance,
  earnings,
  isLocked,
  unlockBlock,
  btcPrice,
  onWithdraw,
  isPending,
}: WithdrawTestCardProps) {
  const handleTestWithdraw = () => {
    // Test with a small amount (0.05 sBTC = 5,000,000 satoshis)
    const testAmount = BigInt(5000000);
    console.log('🧪 Test withdraw amount:', testAmount.toString());
    onWithdraw(testAmount);
  };

  return (
    <Card className="glass border-success/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-success">
          <CheckCircle2 className="w-5 h-5" />
          Withdrawal Test Ready
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-success/10 border border-success/20 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-success">
            <CheckCircle2 className="w-4 h-4" />
            Funds Unlocked - Ready to Withdraw
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pool Balance:</span>
              <span className="font-semibold">{formatSBTC(poolBalance)} sBTC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Earnings:</span>
              <span className="font-semibold text-success">+{formatSBTC(earnings)} sBTC</span>
            </div>
            <div className="flex justify-between border-t border-border/50 pt-2">
              <span className="text-muted-foreground">USD Value:</span>
              <span className="font-bold">{formatUSD(sbtcToUSD(poolBalance, btcPrice))}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold">Test Withdrawal (0.05 sBTC)</div>
          <div className="text-xs text-muted-foreground">
            This will test the withdrawal flow with a small amount. Make sure you have enough for gas fees.
          </div>
        </div>

        <Button
          onClick={handleTestWithdraw}
          disabled={isPending || poolBalance < BigInt(5000000)}
          className="w-full"
          variant="outline"
          style={{ 
            borderColor: 'var(--success)', 
            color: 'var(--success)',
          }}
        >
          {isPending ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Processing Withdrawal...
            </>
          ) : (
            <>
              Test Withdraw 0.05 sBTC
            </>
          )}
        </Button>

        {poolBalance < BigInt(5000000) && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
            <div className="text-xs text-warning">
              Insufficient balance for test withdrawal. Need at least 0.05 sBTC.
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-border/50">
          <a
            href={`https://explorer.hiro.so/address/${unlockBlock}?chain=testnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View unlock block on explorer
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
