import React, { useState } from 'react';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { History } from './components/History';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { AppProvider, useAppContext } from './AppContext';
import { Fingerprint } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, loadingAuth, signIn, error } = useAppContext();

  if (loadingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-surface px-6 text-center">
        <div className="mb-8 p-6 bg-surface-variant rounded-full text-primary">
          <Fingerprint size={64} />
        </div>
        <h1 className="text-display-lg text-on-surface mb-4">Ponto.</h1>
        <p className="text-body-lg text-on-surface-variant max-w-sm mb-12">
          Seu controle de ponto eletrônico minimalista. Faça login para acessar o banco de horas.
        </p>
        {error && (
          <div className="p-4 bg-error-container text-error rounded-lg mb-6 max-w-sm w-full text-sm font-medium">
            {error}
          </div>
        )}
        <button 
          onClick={signIn}
          className="bg-primary text-white font-bold tracking-wider px-8 py-4 rounded-full w-full max-w-sm hover:bg-primary-container hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl cursor-pointer"
        >
          ENTRAR COM GOOGLE
        </button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'history':
        return <History />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-bg text-on-surface flex h-screen font-sans flex-col relative w-full overflow-hidden transition-colors duration-500">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 w-full h-full overflow-y-auto no-scrollbar relative z-10 md:pt-20">
        <div className="w-full min-h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">
          {error && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-error text-white px-6 py-3 rounded-full shadow-lg text-sm font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              {error}
            </div>
          )}
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

