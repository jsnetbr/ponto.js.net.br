import { Fingerprint, LogIn, LogOut, Clock, WifiOff } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { formatMinutes, calculateWorkedMs, sortPunches, toDateKey } from '../utils';

const DEFAULT_PENDING_LUNCH_MINUTES = 60;

export function Dashboard() {
  const { punches, addPunch, expectedMinutes, isSavingPunch, isOnline } = useAppContext();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayKey = toDateKey(now);
  const todayPunches = sortPunches(punches.filter(p => toDateKey(p.timestamp) === todayKey));

  const isWorking = todayPunches.length % 2 !== 0;

  const workedMs = calculateWorkedMs(todayPunches, now.getTime());
  const workedMinutes = Math.floor(workedMs / 60000);

  const h = Math.floor(workedMs / 3600000);
  const m = Math.floor((workedMs % 3600000) / 60000);
  const s = Math.floor((workedMs % 60000) / 1000);
  const format2 = (v: number) => v.toString().padStart(2, '0');

  const remainingMinutes = Math.max(expectedMinutes - workedMinutes, 0);
  const balanceMinutes = workedMinutes - expectedMinutes;
  const pendingLunchMinutes = isWorking && todayPunches.length === 1 ? DEFAULT_PENDING_LUNCH_MINUTES : 0;
  const firstPunch = todayPunches[0];
  const lunchStart = todayPunches[1];
  const lunchEnd = todayPunches[2];
  const finalExit = !isWorking && todayPunches.length >= 4 ? todayPunches[todayPunches.length - 1] : null;
  const hasMissingExit = todayPunches.length % 2 !== 0;
  const buttonLabel = isSavingPunch ? 'SALVANDO...' : (isWorking ? 'REGISTRAR SAÍDA' : 'BATER PONTO');
  const formatTime = (date?: Date | null) => date
    ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  let predictedExitStr = '--:--';
  if (isWorking) {
    const exitTime = new Date(now.getTime() + (remainingMinutes + pendingLunchMinutes) * 60000);
    predictedExitStr = exitTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const getPunchLabel = (index: number) => {
    if (index === 0) return 'Entrada';
    if (index === 1) return 'Saída Almoço';
    if (index === 2) return 'Retorno Almoço';
    if (index === 3) return 'Saída';
    return index % 2 === 0 ? `Entrada Extra ${Math.floor(index/2)}` : `Saída Extra ${Math.floor(index/2)}`;
  };

  const timeString = now.toLocaleTimeString('pt-BR', { hour12: false });
  const dateString = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-6 py-12 flex flex-col items-center relative z-10 min-h-[85vh] pt-12 md:pt-32 pb-32">
      
      {/* Live Clock */}
      <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-[64px] sm:text-[80px] font-extrabold tracking-tighter text-on-surface leading-none mb-2">
          {timeString.substring(0, 5)}<span className="text-outline-variant text-[40px] sm:text-[50px]">:{timeString.substring(6, 8)}</span>
        </h1>
        <p className="text-on-surface-variant font-medium text-lg uppercase tracking-widest">{dateString}</p>
      </div>

      {/* Main Punch Button */}
      <button
        type="button"
        disabled={isSavingPunch || !isOnline}
        className="relative flex items-center justify-center mb-16 cursor-pointer group disabled:cursor-not-allowed disabled:opacity-70"
        onClick={addPunch}
      >
        {isWorking && <div className="absolute inset-0 rounded-full border border-primary/20 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>}
        
        <div className={`w-64 h-64 sm:w-72 sm:h-72 rounded-full flex flex-col items-center justify-center transition-all duration-500 ${isWorking ? 'bg-primary border border-primary text-white shadow-xl scale-[1.02]' : 'bg-surface border-2 border-outline hover:border-primary/50 text-on-surface hover:bg-surface-variant'}`}>
          <Fingerprint size={64} className="mb-4" />
          <span className="text-label-sm tracking-widest">{buttonLabel}</span>
        </div>
      </button>

      {!isOnline && (
        <div className="w-full mb-8 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-error flex items-center gap-3">
          <WifiOff size={20} />
          <span className="text-body-sm font-semibold">Sem internet. O ponto só pode ser registrado quando a conexão voltar.</span>
        </div>
      )}

      {hasMissingExit && (
        <div className="w-full mb-8 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-on-surface">
          <span className="text-body-sm font-semibold">Você está com uma entrada aberta hoje.</span>
        </div>
      )}

      {/* Worked Hours Today & Extra Info */}
      <div className="w-full mb-8 border-b border-outline-variant pb-6">
        <div className="flex justify-between items-end mb-4">
          <div>
            <span className="text-label-sm text-outline tracking-widest block mb-1">HORAS HOJE</span>
            <span className="text-headline-md font-bold text-on-surface">{format2(h)}:{format2(m)}<span className="text-outline text-lg">:{format2(s)}</span></span>
          </div>
          <Clock className={`w-6 h-6 ${isWorking ? 'text-primary animate-pulse' : 'text-outline'}`} />
        </div>
        
        <div className="flex flex-wrap gap-x-8 gap-y-3 pt-2">
          <div className="flex flex-col">
            <span className="text-label-sm text-on-surface-variant">JORNADA</span>
            <span className="text-body-md font-semibold text-on-surface">{formatMinutes(expectedMinutes)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-label-sm text-on-surface-variant">SALDO</span>
            <span className={`text-body-md font-semibold ${balanceMinutes >= 0 ? (balanceMinutes === 0 ? 'text-on-surface' : 'text-primary') : 'text-error'}`}>
              {formatMinutes(balanceMinutes, true)}
            </span>
          </div>
          {isWorking && (
            <div className="flex flex-col">
              <span className="text-label-sm text-on-surface-variant">PREVISÃO DE SAÍDA</span>
              <span className="text-body-md font-semibold text-on-surface">{predictedExitStr}</span>
              {pendingLunchMinutes > 0 && (
                <span className="text-label-sm text-on-surface-variant">
                  inclui {formatMinutes(pendingLunchMinutes)} de intervalo
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="glass-panel rounded-xl p-4">
          <span className="text-label-sm text-on-surface-variant">ENTRADA</span>
          <p className="text-headline-md text-on-surface">{formatTime(firstPunch?.timestamp)}</p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <span className="text-label-sm text-on-surface-variant">ALMOÇO</span>
          <p className="text-headline-md text-on-surface">{formatTime(lunchStart?.timestamp)} - {formatTime(lunchEnd?.timestamp)}</p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <span className="text-label-sm text-on-surface-variant">SAÍDA</span>
          <p className="text-headline-md text-on-surface">{formatTime(finalExit?.timestamp)}</p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <span className="text-label-sm text-on-surface-variant">FALTAM</span>
          <p className="text-headline-md text-on-surface">{isWorking ? formatMinutes(remainingMinutes + pendingLunchMinutes) : '--:--'}</p>
        </div>
      </div>

      {/* Timeline of Punches */}
      <div className="w-full flex flex-col gap-3">
        {todayPunches.length === 0 && (
          <p className="text-center text-on-surface-variant text-sm mt-4">Nenhum registro efetuado hoje.</p>
        )}
        {todayPunches.map((p, index) => {
          const label = getPunchLabel(index);
          const isEntrance = index % 2 === 0;
          return (
            <div key={p.id} className="glass-panel rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isEntrance ? 'bg-primary/10 text-primary' : 'bg-outline-variant text-on-surface-variant'}`}>
                  {isEntrance ? <LogIn size={20} /> : <LogOut size={20} />}
                </div>
                <span className="text-body-md font-semibold text-on-surface">{label}</span>
              </div>
              <span className="text-body-lg font-bold tabular-nums text-on-surface">
                {p.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

