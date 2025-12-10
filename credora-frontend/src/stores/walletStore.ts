import { create } from 'zustand';
import { connect, disconnect, isConnected } from '@stacks/connect';

interface WalletState {
  address: string | null;
  network: 'mainnet' | 'testnet';
  balance: bigint;
  isWalletConnected: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  fetchBalance: () => Promise<void>;
  setBalance: (balance: bigint) => void;
  checkConnection: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  network: 'testnet',
  balance: BigInt(0),
  isWalletConnected: false,
  isConnecting: false,

  checkConnection: () => {
    console.log('🔍 Checking connection status...');
    
    // Check localStorage directly for wallet connection data
    const addressesStr = localStorage.getItem('stacks-connect-addresses');
    console.log('📦 localStorage addresses:', addressesStr);
    
    if (addressesStr) {
      try {
        const addressData = JSON.parse(addressesStr);
        let address: string;
        if (Array.isArray(addressData)) {
          // New format: array of AddressEntry objects - find Stacks address
          const stacksEntry = addressData.find(
            (addr: any) => addr.symbol === 'STX' || addr.purpose === 'stacks' || addr.type === 'stacks'
          );
          address = stacksEntry?.address || addressData[0]?.address || addressData[0];
        } else {
          // Old format: object with testnet/mainnet keys
          address = addressData.testnet || addressData.mainnet;
        }
        
        if (address) {
          console.log('✅ Found saved address:', address);
          
          set({
            address,
            isWalletConnected: true,
          });

          // Fetch balance after loading connection
          get().fetchBalance();
        } else {
          console.log('⚠️ No valid address found in localStorage');
        }
      } catch (error) {
        console.error('❌ Error parsing addresses:', error);
      }
    } else {
      console.log('📭 No saved wallet connection found');
    }
  },

  connectWallet: async () => {
    console.log('🔌 Attempting to connect wallet...');
    set({ isConnecting: true });
    
    try {
      console.log('📱 Calling connect()...');
      // @stacks/connect v8+ doesn't use appDetails parameter
      const response = await connect();
      
      console.log('✅ Connection response:', response);
      console.log('📍 Addresses array:', response.addresses);
      
      // Find the Stacks address from the addresses array
      // Look for address with purpose 'stacks' or addressType 'stacks'
      const stacksAddressEntry = response.addresses.find(
        (addr: any) => addr.symbol === 'STX' || addr.purpose === 'stacks' || addr.type === 'stacks'
      );
      
      if (!stacksAddressEntry) {
        throw new Error('No Stacks address found in wallet response');
      }
      
      console.log('📦 Stacks address entry:', stacksAddressEntry);
      const address = stacksAddressEntry.address;
      console.log('🏠 Connected Stacks address:', address);
      
      // Save addresses to localStorage for session persistence
      localStorage.setItem('stacks-connect-addresses', JSON.stringify(response.addresses));
      console.log('💾 Saved addresses to localStorage');
      
      set({
        address,
        isWalletConnected: true,
        isConnecting: false,
      });

      // Fetch balance after connecting
      get().fetchBalance();
      
    } catch (error) {
      console.error('❌ Wallet connection error:', error);
      set({ isConnecting: false });
      throw error;
    }
  },

  fetchBalance: async () => {
    const { address } = get();
    if (!address) return;

    try {
      console.log('💰 Fetching balance for:', address);
      // Fetch real STX balance from Stacks blockchain
      const { getSTXBalance } = await import('@/lib/contracts/credora');
      const balance = await getSTXBalance(address);
      console.log('💵 Balance:', balance.toString());
      set({ balance });
    } catch (error) {
      console.error('Error fetching balance:', error);
      set({ balance: BigInt(0) });
    }
  },

  disconnectWallet: () => {
    console.log('👋 Disconnecting wallet...');
    disconnect();
    
    // Clear localStorage
    localStorage.removeItem('stacks-connect-addresses');
    console.log('🗑️ Cleared wallet data from localStorage');
    
    set({
      address: null,
      isWalletConnected: false,
      balance: BigInt(0),
    });
    console.log('✅ Wallet disconnected');
  },

  setBalance: (balance: bigint) => {
    set({ balance });
  },
}));
