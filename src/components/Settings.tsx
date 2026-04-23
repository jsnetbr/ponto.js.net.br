import { Clock, Database, Download, LogOut, MapPin, Building } from 'lucide-react';
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';

export function Settings() {
  const { expectedMinutes, updateExpectedMinutes, logOut, user } = useAppContext();
  const [requireLocation, setRequireLocation] = useState(true);

  // Derive initial values for UI
  const currentHours = Math.floor(expectedMinutes / 60);
  const currentMins = expectedMinutes % 60;

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let h = parseInt(e.target.value) || 0;
    if (h < 0) h = 0;
    if (h > 24) h = 24;
    updateExpectedMinutes((h * 60) + currentMins);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let m = parseInt(e.target.value) || 0;
    if (m < 0) m = 0;
    if (m > 59) m = 59;
    updateExpectedMinutes((currentHours * 60) + m);
  };

  return (
    <div className="pt-12 md:pt-32 pb-32 px-6 max-w-3xl mx-auto flex flex-col gap-8 relative z-10 w-full mb-32">
      <div className="mb-4">
        <h2 className="text-display-lg text-on-surface">Ajustes</h2>
        <p className="text-body-md text-on-surface-variant mt-2">Configure sua jornada de trabalho e restrições de ponto.</p>
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
              <span className="text-body-md text-on-surface-variant text-sm">Ex.: 8h48m</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-24">
                <input 
                  type="number" 
                  min="0" max="24"
                  value={currentHours} 
                  onChange={handleHoursChange}
                  className="w-full bg-surface-variant border border-outline-variant rounded-lg px-3 py-2 pr-6 text-body-md font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center" 
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-label-sm">h</span>
              </div>
              <span className="text-surface-variant-on font-bold">:</span>
              <div className="relative w-24">
                <input 
                  type="number" 
                  min="0" max="59"
                  value={currentMins === 0 ? '00' : currentMins} 
                  onChange={handleMinutesChange}
                  className="w-full bg-surface-variant border border-outline-variant rounded-lg px-3 py-2 pr-7 text-body-md font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center" 
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-label-sm">m</span>
              </div>
            </div>
          </div>
          
          <div className="h-px w-full bg-outline-variant"></div>
          
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-label-sm text-on-surface block mb-1">DIAS ÚTEIS DE TRABALHO</label>
              <span className="text-body-md text-on-surface-variant text-sm">Dias mapeados para o mês</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {['SEG', 'TER', 'QUA', 'QUI', 'SEX'].map(day => (
                <button key={day} className="bg-primary/5 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-label-sm hover:bg-primary/10 transition-colors">
                  {day}
                </button>
              ))}
              {['SÁB', 'DOM'].map(day => (
                <button key={day} className="bg-surface-variant text-on-surface-variant border border-outline-variant px-4 py-1.5 rounded-full text-label-sm hover:bg-outline-variant/60 transition-colors">
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-xl overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-outline-variant bg-surface-variant/30">
          <h3 className="text-headline-md text-on-surface flex items-center gap-2">
            <Building className="text-primary w-6 h-6" />
            Configurações da Empresa
          </h3>
        </div>
        <div className="p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <MapPin className="text-outline mt-1 shrink-0" />
              <div>
                <label className="text-label-sm text-on-surface block mb-1">EXIGIR LOCALIZAÇÃO (GPS)</label>
                <span className="text-body-md text-on-surface-variant text-sm">Coletar coordenadas ao bater ponto</span>
              </div>
            </div>
            
            <div className="relative inline-block w-12 align-middle select-none transition duration-200 ease-in ml-4">
              <input 
                type="checkbox" 
                id="toggle1" 
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer z-10 top-0 left-0 transition-transform duration-300 ease-in-out focus:outline-none" 
                checked={requireLocation}
                onChange={() => setRequireLocation(!requireLocation)}
              />
              <label htmlFor="toggle1" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer border transition-colors duration-300 ${requireLocation ? 'bg-primary border-primary' : 'bg-surface-variant border-outline-variant'}`}></label>
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
          <button className="w-full flex items-center justify-between bg-surface-variant hover:bg-outline-variant border border-outline-variant/50 rounded-lg px-5 py-3 transition-colors active:scale-[0.98]">
            <div className="flex items-center gap-3">
              <Download className="text-on-surface w-5 h-5" />
              <span className="text-label-sm text-on-surface mt-0.5">EXPORTAR RELATÓRIO AFD (MTE)</span>
            </div>
            <span className="text-on-surface-variant text-lg font-bold">›</span>
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
