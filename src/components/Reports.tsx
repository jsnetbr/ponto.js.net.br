import { Calendar, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import React, { useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { formatMinutes, calculateWorkedMs } from '../utils';

export function Reports() {
  const { expectedMinutes, punches } = useAppContext();
  
  const { 
    totalExpectedMins, 
    totalWorkedMins, 
    balanceMins, 
    chartData,
    businessDaysElapsed
  } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calcular dias úteis transcorridos no mês atual até hoje
    let businessDays = 0;
    const todayNum = now.getDate();
    for (let d = 1; d <= todayNum; d++) {
        const date = new Date(currentYear, currentMonth, d);
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) businessDays++;
    }

    const expectedTotal = expectedMinutes * businessDays;

    // Isolar os registros do mês vigente
    const monthPunches = punches.filter(p => p.timestamp.getMonth() === currentMonth && p.timestamp.getFullYear() === currentYear);
    const groupsByDay: Record<string, typeof punches> = {};
    monthPunches.forEach(p => {
      const dateKey = p.timestamp.toLocaleDateString('en-CA');
      if (!groupsByDay[dateKey]) groupsByDay[dateKey] = [];
      groupsByDay[dateKey].push(p);
    });

    let workedTotal = 0;
    Object.keys(groupsByDay).forEach(dateKey => {
       const dayPunches = groupsByDay[dateKey].sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());
       const isToday = dateKey === now.toLocaleDateString('en-CA');
       const targetNowMs = isToday ? now.getTime() : dayPunches[dayPunches.length-1].timestamp.getTime();
       const ms = calculateWorkedMs(dayPunches, targetNowMs);
       workedTotal += Math.floor(ms / 60000);
    });

    // Gerar gráfico real com os últimos 14 dias
    const last14Days = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (13 - i));
      return d;
    });

    const cData = last14Days.map(date => {
      const dateKey = date.toLocaleDateString('en-CA');
      const dayPunches = groupsByDay[dateKey] || [];
      const isToday = dateKey === now.toLocaleDateString('en-CA');
      const targetNowMs = isToday ? now.getTime() : (dayPunches.length ? dayPunches[dayPunches.length-1].timestamp.getTime() : 0);
      const ms = calculateWorkedMs(dayPunches, targetNowMs);
      const mins = Math.floor(ms / 60000);
      
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const ideal = isWeekend ? 0 : expectedMinutes;
      let dateLabel = date.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');
      return { val: mins, ideal, dateLabel };
    });

    return {
      totalExpectedMins: expectedTotal,
      totalWorkedMins: workedTotal,
      balanceMins: workedTotal - expectedTotal,
      chartData: cData,
      businessDaysElapsed: businessDays
    };
  }, [punches, expectedMinutes]);
  
  const expectedFmt = formatMinutes(totalExpectedMins);
  const workedFmt = formatMinutes(totalWorkedMins);
  const balanceFmt = formatMinutes(balanceMins, true);

  const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();

  return (
    <div className="pt-12 md:pt-32 pb-32 px-6 max-w-5xl mx-auto flex flex-col gap-8 relative z-10 w-full">
      <div className="mb-4">
        <h2 className="text-display-lg text-on-surface">Relatórios</h2>
        <p className="text-body-md text-on-surface-variant mt-2">Métricas de rendimento reais do seu mês.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel rounded-xl p-6 md:col-span-1 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500"></div>
          <h3 className="text-body-sm font-bold text-on-surface-variant mb-2">SALDO DO MÊS</h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-display-lg font-bold ${balanceMins >= 0 ? 'text-primary' : 'text-error'}`}>
              {balanceFmt}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-4 text-label-sm font-medium">
             <span className={`flex items-center gap-1 ${balanceMins >= 0 ? 'text-primary bg-primary/10' : 'text-error bg-error/10'} px-2 py-1 rounded-full`}>
               {balanceMins >= 0 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
               {balanceMins >= 0 ? 'Banco Positivo' : 'Banco Negativo'}
             </span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-6 md:col-span-2 flex flex-col">
          <h3 className="text-body-sm font-bold text-on-surface-variant mb-6">ÚLTIMOS 14 DIAS</h3>
          <div className="flex-1 flex items-end gap-2 h-40">
             {chartData.map((data, i) => {
               const ideal = data.ideal;
               const val = data.val;
               const height = ideal === 0 ? (val > 0 ? (val / expectedMinutes) * 100 : 5) : (val / (expectedMinutes * 1.5)) * 100;
               const heightClamped = Math.min(100, Math.max(5, height));
               let barColor = "bg-primary";
               if (val > ideal && ideal !== 0) barColor = "bg-primary-container border-t-2 border-primary";
               if (val < ideal && ideal !== 0 && val !== 0) barColor = "bg-error-container";
               if (ideal === 0) barColor = "bg-surface-variant";

               return (
                 <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2 group relative">
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-variant text-on-surface text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10 border border-outline-variant shadow-lg z-20">
                       {formatMinutes(val)}
                    </div>
                    <div 
                      className={`w-full rounded-t-sm transition-all duration-500 ease-out group-hover:opacity-80 ${barColor} relative`} 
                      style={{ height: `${heightClamped}%` }}
                    ></div>
                 </div>
               )
             })}
          </div>
          <div className="flex justify-between items-center mt-4 text-label-sm text-on-surface-variant border-t border-outline-variant pt-4">
             <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary-container border border-primary"></div> Hora Extra</span>
             <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary"></div> Previsto</span>
             <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-error-container"></div> Incompleto</span>
          </div>
        </div>
      </div>

      <section className="glass-panel rounded-xl overflow-hidden mt-2">
        <div className="px-6 py-5 border-b border-outline-variant bg-surface-variant/30 flex justify-between items-center">
          <h3 className="text-headline-md text-on-surface flex items-center gap-2">
            <Calendar className="text-primary w-6 h-6" />
            Resumo do Período
          </h3>
          <span className="text-primary text-label-sm font-bold flex items-center">
            {monthName}
          </span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-outline-variant/30 hover:bg-surface-variant/20 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-on-surface-variant" />
              </div>
              <div>
                <p className="text-body-lg font-bold text-on-surface">Estimativa Esperada</p>
                <p className="text-body-sm text-on-surface-variant">Base contratual ({businessDaysElapsed} dias úteis até hoje)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-headline-sm font-bold text-on-surface">{expectedFmt}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-6 border-b border-outline-variant/30 hover:bg-surface-variant/20 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-body-lg font-bold text-on-surface">Horas Trabalhadas</p>
                <p className="text-body-sm text-on-surface-variant">Líquidas computadas</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-headline-sm font-bold text-primary">{workedFmt}</p>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
