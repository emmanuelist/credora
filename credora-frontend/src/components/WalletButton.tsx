import { Wallet, LogOut, Copy, ExternalLink, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWalletStore } from '@/stores/walletStore';
import { useSBTCBalance, useSTXBalance } from '@/hooks/useCredoraContract';
import { toast } from 'sonner';

export function WalletButton() {
  const { address, isWalletConnected, isConnecting, connectWallet, disconnectWallet } = useWalletStore();
  const { data: sbtcBalance } = useSBTCBalance();
  const { data: stxBalance } = useSTXBalance();

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
    }
  };

  const viewOnExplorer = () => {
    if (address) {
      window.open(`https://explorer.hiro.so/address/${address}?chain=testnet`, '_blank');
    }
  };

  const handleConnect = async () => {
    try {
      await connectWallet();
      toast.success('Wallet connected!', {
        description: 'Successfully connected to your Stacks wallet',
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      toast.error('Failed to connect wallet', {
        description: 'Please make sure you have a Stacks wallet installed (Leather, or Xverse)',
      });
    }
  };

  if (!isWalletConnected) {
    return (
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="relative overflow-hidden group"
        style={{
          background: 'var(--gradient-primary)',
        }}
      >
        <Wallet className="w-4 h-4 mr-2" />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="glass group">
          <Wallet className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
          {truncateAddress(address!)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass border-border w-72">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Wallet Balances</p>
            
            {/* STX Balance */}
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Coins className="w-4 h-4 mr-2 text-orange-500" />
                <span className="font-medium">STX</span>
              </div>
              <span className="font-bold">
                {stxBalance ? (Number(stxBalance) / 1000000).toFixed(6) : '0.000000'}
              </span>
            </div>
            
            {/* sBTC Balance */}
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Coins className="w-4 h-4 mr-2 text-primary" />
                <span className="font-medium">sBTC</span>
              </div>
              <span className="font-bold text-primary">
                {sbtcBalance ? (Number(sbtcBalance) / 100000000).toFixed(8) : '0.00000000'}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
          <Copy className="w-4 h-4 mr-2" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem onClick={viewOnExplorer} className="cursor-pointer">
          <ExternalLink className="w-4 h-4 mr-2" />
          View on Explorer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnectWallet} className="cursor-pointer text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
