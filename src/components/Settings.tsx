import { Clock, Database, Download, LogOut } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../AppContext';

export function Settings() {
  const { expectedMinutes, updateExpectedMinutes, logOut, user } = useAppContext();

  // Local state for lazy update
  const [localHours, setLocalHours] = useState(Math.floor(expectedMinutes / 60));
  const [localMins, setLocalMins] = useState(expectedMinutes % 60);

  useEffect(() => {
    setLocalHours(Math.floor(expectedMinutes / 60));
    setLocalMins(expectedMinutes % 60);
  }, [expectedMinutes]);

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const parseNumber = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const handleSave = () => {
    const nextHours = clamp(localHours, 0, 24);
    const nextMinutes = clamp(localMins, 0, 59);
    setLocalHours(nextHours);
    setLocalMins(nextMinutes);
    updateExpectedMinutes((nextHours * 60) + nextMinutes);
  };

  return (
    <div className="pt-12 md:pt-32 pb-32 px-6 max-w-3xl mx-auto flex flex-col gap-8 relative z-10 w-full mb-32">
      <div className="mb-4">
        <h2 className="text-display-lg text-on-surface">Ajustes</h2>
        <p className="text-body-md text-on-surface-variant mt-2">Configure sua jornada de trabalho.</p>
      </div>

      <section className="glass-panel rounded-xl overflow-hidden flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-outline-variant">
               {user?.photoURL ? (
                 <img src={user.photoURL} alt="User avatar" />
               ) : (
                 <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                   {user?.email?.[0].toUpperCase() || 'U'}
                 </div>
               )}
            </div>
            <div>
              <p className="text-body-lg font-bold text-on-surface">{user?.displayName || 'Usuário'}</p>
              <p className="text-body-sm text-on-surface-variant">{user?.email}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-xl overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-outline-variant bg-surface-variant/30">
          <h3 className="text-headline-md text-on-surface flex items-center gap-2">
            <Clock className="text-primary w-6 h-6" />
            Jornada de Trabalho
          </h3>
        </div>
        <div className="p-6 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <label className="text-label-sm text-on-surface block mb-1">JORNADA DIÁRIA PREVISTA</label>
              <span className="text-body-md text-on-surface-variant text-sm">Defina quanto tempo você deve trabalhar por dia.</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-24">
                <input 
                  type="number" 
                  min="0" max="24"
                  value={localHours} 
                  onChange={(e) => setLocalHours(clamp(parseNumber(e.target.value), 0, 24))}
                  onBlur={handleSave}
                  className="w-full bg-surface-variant border border-outline-variant rounded-lg px-3 py-2 pr-6 text-body-md font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center" 
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-label-sm">h</span>
              </div>
              <span className="text-surface-variant-on font-bold">:</span>
              <div className="relative w-24">
                <input 
                  type="number" 
                  min="0" max="59"
                  value={localMins.toString().padStart(2, '0')} 
                  onChange={(e) => setLocalMins(clamp(parseNumber(e.target.value), 0, 59))}
                  onBlur={handleSave}
                  className="w-full bg-surface-variant border border-outline-variant rounded-lg px-3 py-2 pr-7 text-body-md font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center" 
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-label-sm">m</span>
              </div>
            </div>
          </div>
          
          <div className="h-px w-full bg-outline-variant"></div>
          
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-label-sm text-on-surface block mb-1 font-bold">CÁLCULO DO PREVISTO</label>
              <p className="text-body-sm text-on-surface-variant">O sistema considera o previsto apenas para os dias em que houve registro de ponto.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-xl overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-outline-variant bg-surface-variant/30">
          <h3 className="text-headline-md text-on-surface flex items-center gap-2">
            <Database className="text-primary w-6 h-6" />
            Avançado
          </h3>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <button
            type="button"
            disabled
            title="Exportação AFD ainda não está disponível."
            className="w-full flex items-center justify-between bg-surface-variant border border-outline-variant/50 rounded-lg px-5 py-3 opacity-60 cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <Download className="text-on-surface w-5 h-5" />
              <span className="text-label-sm text-on-surface mt-0.5">EXPORTAR RELATÓRIO AFD (MTE)</span>
            </div>
            <span className="text-label-sm text-on-surface-variant">EM BREVE</span>
          </button>
          
          <button onClick={logOut} className="w-full flex items-center justify-between bg-surface-variant hover:bg-outline-variant border border-outline-variant/50 rounded-lg px-5 py-3 transition-colors active:scale-[0.98] mt-2">
             <div className="flex items-center gap-3">
               <LogOut className="text-on-surface-variant w-5 h-5" />
               <span className="text-label-sm text-on-surface-variant mt-0.5">SAIR DA CONTA</span>
             </div>
          </button>
        </div>
      </section>
    </div>
  );
}
