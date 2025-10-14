import { useWallet } from '../contexts/WalletContext';

export function Header() {
  const { isConnected, walletAddress, connectWallet, disconnectWallet } = useWallet();

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : '';

  return (
    <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg"></div>
            <h1 className="text-2xl font-bold text-white">Credora</h1>
          </div>

          <div className="flex items-center space-x-4">
            {isConnected ? (
              <>
                <span className="text-slate-300 text-sm">{shortAddress}</span>
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={connectWallet}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
