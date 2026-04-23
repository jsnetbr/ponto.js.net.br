import { 
    Clock, 
    CalendarDays, 
    LineChart, 
    Settings2,
    Fingerprint
} from 'lucide-react';
import React from 'react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  const tabs = [
    { id: 'dashboard', label: 'Ponto', icon: Fingerprint },
    { id: 'history', label: 'Histórico', icon: CalendarDays },
    { id: 'reports', label: 'Relatórios', icon: LineChart },
    { id: 'settings', label: 'Ajustes', icon: Settings2 },
  ];

  return (
    <>
      <header className="hidden md:flex justify-between items-center px-8 h-20 w-full fixed top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline shadow-sm transition-all">
        <div className="flex items-center gap-4">
          <Clock className="text-primary w-6 h-6" />
          <span className="font-extrabold text-2xl tracking-tighter text-on-surface">Ponto.</span>
        </div>
        
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-label-sm flex items-center gap-2 hover:bg-surface-variant transition-all rounded-lg px-4 py-2.5 ${
                activeTab === tab.id ? 'bg-primary-container text-primary' : 'text-on-surface-variant'
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <nav className="md:hidden fixed bottom-6 left-4 right-4 flex justify-around items-center h-16 px-2 bg-surface-variant backdrop-blur-md rounded-2xl z-50 shadow-2xl border border-outline">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center px-4 py-2 transition-all active:scale-90 duration-200 rounded-xl w-full h-full ${
              activeTab === tab.id 
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <tab.icon size={22} className={activeTab === tab.id ? 'scale-110 mb-1 transition-transform' : 'mb-1'} />
            {activeTab === tab.id && <span className="text-[10px] uppercase font-bold tracking-widest">{tab.label}</span>}
          </button>
        ))}
      </nav>
    </>
  );
}


