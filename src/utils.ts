export interface SimplePunch {
  timestamp: Date;
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
  for (let i = 0; i < punches.length; i += 2) {
    const start = punches[i].timestamp.getTime();
    const end = punches[i + 1] ? punches[i + 1].timestamp.getTime() : targetNowMs;
    workedMs += (end - start);
  }
  return workedMs;
}
