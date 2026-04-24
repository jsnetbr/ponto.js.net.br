export interface SimplePunch {
  id?: string;
  timestamp: Date;
}

export function toDateKey(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

export function toMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

export function sortPunches<T extends SimplePunch>(punches: T[]): T[] {
  return [...punches].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export function formatMinutes(mins: number, showSign = false): string {
  if (isNaN(mins) || !isFinite(mins)) return '--:--';
  const num = Math.abs(Math.round(mins));
  const hrs = Math.floor(num / 60).toString().padStart(2, '0');
  const ms = (num % 60).toString().padStart(2, '0');
  const sign = mins < 0 ? '-' : (mins > 0 && showSign ? '+' : '');
  return `${sign}${hrs}:${ms}`;
}

export function calculateWorkedMs(punches: SimplePunch[], targetNowMs: number): number {
  let workedMs = 0;
  const sortedPunches = sortPunches(punches);

  for (let i = 0; i < sortedPunches.length; i += 2) {
    const start = sortedPunches[i].timestamp.getTime();
    const end = sortedPunches[i + 1] ? sortedPunches[i + 1].timestamp.getTime() : targetNowMs;

    if (end > start) {
      workedMs += (end - start);
    }
  }

  return workedMs;
}

export function validateEditedPunchTime(
  punches: SimplePunch[],
  punchId: string,
  nextTimestamp: Date,
): string | null {
  if (!(nextTimestamp instanceof Date) || Number.isNaN(nextTimestamp.getTime())) {
    return 'Horário inválido para atualizar ponto.';
  }

  const sortedPunches = sortPunches(punches);
  const currentIndex = sortedPunches.findIndex((punch) => punch.id === punchId);
  if (currentIndex === -1) {
    return 'Registro não encontrado para edição.';
  }

  const currentPunch = sortedPunches[currentIndex];
  if (toDateKey(currentPunch.timestamp) !== toDateKey(nextTimestamp)) {
    return 'Para manter a folha consistente, edite apenas o horário dentro do mesmo dia.';
  }

  const previousPunch = sortedPunches[currentIndex - 1];
  const nextPunch = sortedPunches[currentIndex + 1];
  const nextTime = nextTimestamp.getTime();

  if (previousPunch && nextTime <= previousPunch.timestamp.getTime()) {
    return 'O horário precisa ficar depois do registro anterior.';
  }

  if (nextPunch && nextTime >= nextPunch.timestamp.getTime()) {
    return 'O horário precisa ficar antes do próximo registro.';
  }

  return null;
}
