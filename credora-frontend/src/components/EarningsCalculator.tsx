import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { TrendingUp, Calculator } from 'lucide-react';

interface EarningsCalculatorProps {
  currentAPY?: number;
}

export function EarningsCalculator({ currentAPY = 15 }: EarningsCalculatorProps) {
  const [depositAmount, setDepositAmount] = useState(0.1);
  const [duration, setDuration] = useState(12); // months

  const calculateEarnings = () => {
    const monthlyRate = currentAPY / 100 / 12;
    const compoundedAmount = depositAmount * Math.pow(1 + monthlyRate, duration);
    const earnings = compoundedAmount - depositAmount;
    return {
      total: compoundedAmount,
      earnings: earnings,
      percentage: (earnings / depositAmount) * 100,
    };
  };

  const results = calculateEarnings();

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Earnings Calculator</CardTitle>
            <CardDescription>Project your lending returns</CardDescription>
          </div>
          <div className="p-2 rounded-lg bg-success/10">
            <Calculator className="w-5 h-5 text-success" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Deposit Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="deposit">Deposit Amount (sBTC)</Label>
          <Input
            id="deposit"
            type="number"
            step="0.001"
            value={depositAmount}
            onChange={(e) => setDepositAmount(Number(e.target.value))}
            className="font-mono"
          />
        </div>

        {/* Duration Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Duration</Label>
            <span className="text-sm font-medium">{duration} months</span>
          </div>
          <Slider
            value={[duration]}
            onValueChange={([value]) => setDuration(value)}
            min={1}
            max={36}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 month</span>
            <span>36 months</span>
          </div>
        </div>

        {/* APY Display */}
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current APY</span>
            <div className="flex items-center gap-1 text-primary font-bold">
              <TrendingUp className="w-4 h-4" />
              {currentAPY.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Earnings</span>
            <span className="text-lg font-bold text-success">
              +{results.earnings.toFixed(6)} sBTC
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Value</span>
            <span className="text-lg font-bold">
              {results.total.toFixed(6)} sBTC
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Growth</span>
            <span className="text-sm font-semibold text-success">
              +{results.percentage.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
          * Estimated earnings based on current APY. Actual returns may vary based on pool utilization and market conditions.
        </p>
      </CardContent>
    </Card>
  );
}
