import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format sBTC (micro-BTC) to readable format (8 decimals - Bitcoin standard)
export function formatSBTC(amount: bigint, decimals: number = 8): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  
  if (fraction === BigInt(0)) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fractionStr}`;
}

// Format USD value
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Convert sBTC to USD using current BTC price
// btcPrice should come from useBTCPrice hook in components
export function sbtcToUSD(amount: bigint, btcPrice: number = 100000): number {
  const sbtc = Number(formatSBTC(amount));
  return sbtc * btcPrice;
}

// Parse string to sBTC amount (8 decimals - Bitcoin standard)
export function parseToSBTC(value: string, decimals: number = 8): bigint {
  try {
    const [whole, fraction = ''] = value.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    const combined = whole + paddedFraction;
    return BigInt(combined);
  } catch {
    return BigInt(0);
  }
}

// Format blocks to days
export function blocksToDays(blocks: number): number {
  return Math.floor(blocks / 144); // Approximately 144 blocks per day
}

// Format date from block height
export function formatDueDate(dueBlock: number, currentBlock: number = 150000): string {
  const blocksRemaining = Math.max(0, dueBlock - currentBlock);
  const daysRemaining = blocksToDays(blocksRemaining);
  const date = new Date();
  date.setDate(date.getDate() + daysRemaining);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
