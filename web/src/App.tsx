import { useState } from 'react';
import { WalletProvider } from './contexts/WalletContext';
import { Header } from './components/Header';
import { LenderDashboard } from './pages/LenderDashboard';
import { BorrowerDashboard } from './pages/BorrowerDashboard';
import { TransactionHistory } from './pages/TransactionHistory';
import { Toaster } from 'react-hot-toast';

type Tab = 'lender' | 'borrower' | 'history';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('lender');

  return (
    <WalletProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
            },
          }}
        />
        <Header />

        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex space-x-2 bg-slate-800/50 backdrop-blur-sm p-1 rounded-lg inline-flex">
              <button
                onClick={() => setActiveTab('lender')}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  activeTab === 'lender'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Lender
              </button>
              <button
                onClick={() => setActiveTab('borrower')}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  activeTab === 'borrower'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Borrower
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                History
              </button>
            </div>
          </div>

          {activeTab === 'lender' && <LenderDashboard />}
          {activeTab === 'borrower' && <BorrowerDashboard />}
          {activeTab === 'history' && <TransactionHistory />}
        </div>
      </div>
    </WalletProvider>
  );
}

export default App;
