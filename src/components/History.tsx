import { Calendar as CalendarIcon, Download, Filter, CheckCircle2, AlertCircle, Trash2, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { formatMinutes, calculateWorkedMs, sortPunches, toDateKey, toMonthKey, validateEditedPunchTime } from '../utils';

export function History() {
  const { punches, expectedMinutes, updatePunch, deletePunch } = useAppContext();
  const [now, setNow] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(toMonthKey(new Date()));
  
  const [editingPunch, setEditingPunch] = useState<{ id: string, dateObj: Date, timeStr: string } | null>(null);
  const [editTime, setEditTime] = useState('');

  useEffect(() => {
    if (!editingPunch) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditingPunch(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingPunch]);

  const editValidationMessage = (() => {
    if (!editingPunch || !editTime) return null;
    const [hh, mm] = editTime.split(':').map(Number);
    if (isNaN(hh) || isNaN(mm)) return 'Informe um horário válido no formato HH:MM.';
    const candidate = new Date(editingPunch.dateObj);
    candidate.setHours(hh, mm, 0, 0);
    return validateEditedPunchTime(punches, editingPunch.id, candidate);
  })();

  useEffect(() => {
    // Atualiza a cada 1 minuto para o estado "trabalhando" renderizar corretamente os totais
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Agrupar batidas por dia (usando o fuso local dinâmico)
  const groups: Record<string, typeof punches> = {};
  const filteredPunches = punches.filter(p => toMonthKey(p.timestamp) === selectedMonth);

  filteredPunches.forEach(p => {
    const dateKey = toDateKey(p.timestamp);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(p);
  });

  const todayKey = toDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  const daysData = Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(dateKey => {
    const dayPunches = sortPunches(groups[dateKey]);
    
    const isToday = dateKey === todayKey;
    const targetNowMs = isToday ? now.getTime() : dayPunches[dayPunches.length - 1].timestamp.getTime();
    
    const workedMs = calculateWorkedMs(dayPunches, targetNowMs);
    const totalMinutes = Math.floor(workedMs / 60000);
    const totalFmt = formatMinutes(totalMinutes);

    const hasOpenPunch = dayPunches.length % 2 !== 0;
    const isWorking = hasOpenPunch && isToday;
    
    let status = 'incomplete';
    if (isWorking) {
      status = 'working';
    } else if (hasOpenPunch) {
      status = 'open';
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
      dateKey,
      hasOpenPunch,
      status,
      total: totalFmt,
      balance: formatMinutes(totalMinutes - expectedMinutes, true),
      punches: uiPunches
    };
  });

  const [selectedYear, selectedMonthNumber] = selectedMonth.split('-').map(Number);
  const selectedMonthDate = new Date(selectedYear, selectedMonthNumber - 1, 1);
  const monthName = selectedMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const currentMonthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const handleExportCsv = () => {
    const header = ['Data', 'Entrada 1', 'Saída 1', 'Entrada 2', 'Saída 2', 'Total', 'Saldo', 'Observação'];
    const rows = daysData.map((day) => {
      const values = day.punches.slice(0, 4).map((p) => p.displayStr);
      while (values.length < 4) values.push('--:--');

      return [
        day.dateKey,
        ...values,
        day.total,
        day.balance,
        day.hasOpenPunch ? 'Entrada sem saída' : '',
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ponto-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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

    if (editValidationMessage) return;
    
    const saved = await updatePunch(editingPunch.id, targetDate);
    if (saved) {
      setEditingPunch(null);
    }
  };

  const handleDelete = async () => {
    if (!editingPunch) return;
    if (window.confirm("Certeza que deseja excluir este ponto? Essa ação não pode ser desfeita.")) {
      const deleted = await deletePunch(editingPunch.id);
      if (deleted) {
        setEditingPunch(null);
      }
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

      <div className="glass-panel rounded-xl p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 shadow-sm">
        <div className="flex items-center gap-3 px-3">
          <CalendarIcon className="text-outline" size={20} />
          <span className="text-body-md text-on-surface font-medium capitalize">{currentMonthLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-on-surface-variant px-3 py-2 rounded-lg bg-surface">
            <Filter size={18} />
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value || toMonthKey(now))}
              className="bg-transparent text-body-sm text-on-surface outline-none"
            />
          </label>
              <button
            type="button"
            disabled={daysData.length === 0}
            onClick={handleExportCsv}
            aria-label="Exportar histórico em CSV"
            className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors px-4 py-2 rounded-lg hover:bg-surface-variant disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            <span className="text-label-sm hidden sm:inline">CSV</span>
          </button>
        </div>
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
                  {day.status === 'open' && <AlertCircle className="text-error w-5 h-5" title="Entrada sem saída" />}
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
              {day.hasOpenPunch && (
                <div className="mt-4 rounded-lg border border-error/30 bg-error-container/60 px-3 py-2 text-error text-body-sm font-semibold">
                  Este dia tem uma entrada sem saída. Confira se faltou registrar ou editar alguma batida.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingPunch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-sm rounded-2xl p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
             <button 
               onClick={() => setEditingPunch(null)}
               aria-label="Fechar modal de edição"
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
                  aria-label="Excluir registro de ponto"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-error-container text-error rounded-xl hover:bg-error/20 transition-colors font-semibold"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={Boolean(editValidationMessage)}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  SALVAR
                </button>
             </div>
             {editValidationMessage && (
               <p className="mt-4 text-body-sm text-error font-semibold">
                 {editValidationMessage}
               </p>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
