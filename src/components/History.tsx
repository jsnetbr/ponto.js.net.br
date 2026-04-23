import { Calendar as CalendarIcon, Filter, CheckCircle2, AlertCircle, Trash2, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { formatMinutes, calculateWorkedMs } from '../utils';

export function History() {
  const { punches, expectedMinutes, updatePunch, deletePunch } = useAppContext();
  const [now, setNow] = useState(new Date());
  
  const [editingPunch, setEditingPunch] = useState<{ id: string, dateObj: Date, timeStr: string } | null>(null);
  const [editTime, setEditTime] = useState('');

  useEffect(() => {
    // Atualiza a cada 1 minuto para o estado "trabalhando" renderizar corretamente os totais
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Agrupar batidas por dia (usando o fuso local dinâmico)
  const groups: Record<string, typeof punches> = {};
  punches.forEach(p => {
    const dateKey = p.timestamp.toLocaleDateString('en-CA'); // YYYY-MM-DD
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(p);
  });

  const todayKey = now.toLocaleDateString('en-CA');
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toLocaleDateString('en-CA');

  const daysData = Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(dateKey => {
    const dayPunches = groups[dateKey].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const isToday = dateKey === todayKey;
    const targetNowMs = isToday ? now.getTime() : dayPunches[dayPunches.length - 1].timestamp.getTime();
    
    const workedMs = calculateWorkedMs(dayPunches, targetNowMs);
    const totalMinutes = Math.floor(workedMs / 60000);
    const totalFmt = formatMinutes(totalMinutes);

    const isWorking = dayPunches.length % 2 !== 0 && isToday;
    
    let status = 'incomplete';
    if (isWorking) {
      status = 'working';
    } else if (totalMinutes >= expectedMinutes) {
      status = 'complete';
    }

    // Format string date safely
    const [yyyy, mm, dd] = dateKey.split('-').map(Number);
    const dateObj = new Date(yyyy, mm - 1, dd);
    let dateLabel = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' }).toUpperCase().replace('.', '');
    
    if (dateKey === todayKey) {
      dateLabel = `HOJE, ${dateLabel}`;
    } else if (dateKey === yesterdayKey) {
      dateLabel = `ONTEM, ${dateLabel}`;
    }

    // Preparar UI limitando esteticamente ou expandindo dinamicamente as batidas
    const uiPunches = [];
    const padTo = Math.max(4, dayPunches.length + (dayPunches.length % 2 !== 0 ? 1 : 0));
    
    for(let j = 0; j < padTo; j++) {
      if (dayPunches[j]) {
        uiPunches.push({
          id: dayPunches[j].id,
          dateObj: dayPunches[j].timestamp,
          displayStr: dayPunches[j].timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        });
      } else {
        uiPunches.push({ id: null, dateObj: null, displayStr: '--:--' });
      }
    }

    return {
      date: dateLabel,
      status,
      total: totalFmt,
      punches: uiPunches
    };
  });

  const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const currentMonthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const handleOpenEdit = (punch: { id: string, dateObj: Date, displayStr: string }) => {
    setEditingPunch({ id: punch.id, dateObj: punch.dateObj, timeStr: punch.displayStr });
    setEditTime(punch.displayStr);
  };

  const handleSaveEdit = async () => {
    if (!editingPunch || !editTime) return;
    const [hh, mm] = editTime.split(':').map(Number);
    if (isNaN(hh) || isNaN(mm)) return;
    
    const targetDate = new Date(editingPunch.dateObj);
    targetDate.setHours(hh, mm, 0, 0);
    
    await updatePunch(editingPunch.id, targetDate);
    setEditingPunch(null);
  };

  const handleDelete = async () => {
    if (!editingPunch) return;
    if (window.confirm("Certeza que deseja excluir este ponto? Essa ação não pode ser desfeita.")) {
      await deletePunch(editingPunch.id);
      setEditingPunch(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 pt-12 pb-32 md:pt-32 relative z-10 w-full">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-display-lg text-on-surface mb-2">Histórico</h1>
          <p className="text-body-lg text-on-surface-variant">Sua folha de ponto mensal.</p>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-2 flex items-center justify-between mb-8 shadow-sm">
        <div className="flex items-center gap-3 px-3">
          <CalendarIcon className="text-outline" size={20} />
          <span className="text-body-md text-on-surface font-medium capitalize">{currentMonthLabel}</span>
        </div>
        <button className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors px-4 py-2 rounded-lg hover:bg-surface-variant">
          <Filter size={18} />
          <span className="text-label-sm hidden sm:inline">FILTRAR</span>
        </button>
      </div>

      {daysData.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mb-4 text-outline">
            <CalendarIcon size={32} />
          </div>
          <h3 className="text-body-lg font-bold text-on-surface mb-2">Nenhum registro encontrado</h3>
          <p className="text-body-sm text-on-surface-variant max-w-sm">Você ainda não bateu o ponto. Seus registros aparecerão aqui assim que realizar sua primeira marcação.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {daysData.map((day, i) => (
            <div key={i} className="glass-panel rounded-2xl p-5 hover:border-primary/30 transition-colors">
              <div className="flex justify-between items-center mb-4 border-b border-outline-variant pb-3">
                <div className="flex items-center gap-3">
                  {day.status === 'complete' && <CheckCircle2 className="text-emerald-500 w-5 h-5" title="Jornada Completa" />}
                  {day.status === 'incomplete' && <AlertCircle className="text-amber-500 w-5 h-5" title="Jornada Incompleta" />}
                  {day.status === 'working' && <div className="w-3 h-3 rounded-full bg-primary animate-pulse ml-1 mr-1" title="Em andamento"></div>}
                  <span className="text-label-sm text-on-surface-variant tracking-wider font-bold">{day.date}</span>
                </div>
                <span className={`text-headline-md font-extrabold tabular-nums flex items-baseline gap-1 ${day.status === 'incomplete' ? 'text-amber-600' : 'text-on-surface'}`}>
                  {day.total}
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {day.punches.map((p, j) => {
                  const isEntrance = j % 2 === 0;
                  const index = Math.floor(j / 2) + 1;
                  const label = isEntrance ? `Ent ${index}` : `Sai ${index}`;

                  return (
                    <div key={j} className="flex flex-col items-center">
                      <span className="text-[10px] uppercase text-on-surface-variant opacity-80 font-bold mb-1">
                        {label}
                      </span>
                      <button 
                        onClick={() => p.id && p.dateObj && handleOpenEdit({ id: p.id, dateObj: p.dateObj, displayStr: p.displayStr })}
                        className={`w-full py-2 flex justify-center rounded-lg transition-colors ${p.id ? 'hover:bg-primary/20 hover:text-primary cursor-pointer' : ''} ${p.displayStr === '--:--' ? 'bg-surface border border-dashed border-outline-variant text-on-surface-variant opacity-60 cursor-default' : 'bg-surface-variant text-on-surface'}`}
                      >
                        <span className="text-body-md font-semibold tabular-nums">{p.displayStr}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex justify-center mt-8">
            <button className="glass-panel border border-outline hover:border-primary/50 text-on-surface-variant text-label-sm px-6 py-2.5 rounded-full hover:bg-surface-variant transition-colors shadow-sm">
              VER ANTERIORES
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingPunch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-sm rounded-2xl p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
             <button 
               onClick={() => setEditingPunch(null)}
               className="absolute top-4 right-4 text-outline hover:text-on-surface transition-colors"
             >
               <X size={20} />
             </button>
             
             <h3 className="text-headline-sm font-bold text-on-surface mb-6">Editar Registro</h3>
             <label className="block text-label-sm font-bold text-outline-variant mb-2 pl-1">HORÁRIO</label>
             <input 
               type="time" 
               value={editTime}
               onChange={(e) => setEditTime(e.target.value)}
               className="w-full bg-surface-variant/50 border border-outline-variant text-on-surface text-headline-md font-semibold rounded-xl h-16 px-4 mb-8 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-center file:hidden"
             />

             <div className="flex justify-between items-center gap-3">
                <button 
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-error-container text-error rounded-xl hover:bg-error/20 transition-colors font-semibold"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
                >
                  SALVAR
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

