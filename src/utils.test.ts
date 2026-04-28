import { describe, expect, it } from 'vitest';

import {
  calculateWorkedMs,
  formatMinutes,
  sortPunches,
  validateEditedPunchTime,
  type SimplePunch,
} from './utils';

describe('utils', () => {
  it('sortPunches should sort by timestamp ascending', () => {
    const punches: SimplePunch[] = [
      { id: '2', timestamp: new Date('2026-01-01T12:00:00.000Z') },
      { id: '1', timestamp: new Date('2026-01-01T08:00:00.000Z') },
    ];

    const sorted = sortPunches(punches);
    expect(sorted.map((p) => p.id)).toEqual(['1', '2']);
    expect(punches.map((p) => p.id)).toEqual(['2', '1']);
  });

  it('formatMinutes should round and apply sign when requested', () => {
    expect(formatMinutes(125)).toBe('02:05');
    expect(formatMinutes(-65)).toBe('-01:05');
    expect(formatMinutes(30, true)).toBe('+00:30');
    expect(formatMinutes(Number.NaN)).toBe('--:--');
  });

  it('calculateWorkedMs should pair punches and use now when odd number of entries', () => {
    const punches: SimplePunch[] = [
      { timestamp: new Date('2026-01-01T08:00:00.000Z') },
      { timestamp: new Date('2026-01-01T12:00:00.000Z') },
      { timestamp: new Date('2026-01-01T13:00:00.000Z') },
    ];

    const now = new Date('2026-01-01T17:00:00.000Z').getTime();
    expect(calculateWorkedMs(punches, now)).toBe(8 * 60 * 60 * 1000);
  });

  it('validateEditedPunchTime should enforce same day and ordering', () => {
    const punches: SimplePunch[] = [
      { id: '1', timestamp: new Date('2026-01-01T08:00:00.000Z') },
      { id: '2', timestamp: new Date('2026-01-01T12:00:00.000Z') },
      { id: '3', timestamp: new Date('2026-01-01T13:00:00.000Z') },
    ];

    expect(validateEditedPunchTime(punches, '2', new Date('2026-01-01T11:00:00.000Z'))).toBeNull();
    expect(validateEditedPunchTime(punches, '2', new Date('2026-01-02T11:00:00.000Z'))).toContain('mesmo dia');
    expect(validateEditedPunchTime(punches, '2', new Date('2026-01-01T07:00:00.000Z'))).toContain('depois');
    expect(validateEditedPunchTime(punches, '2', new Date('2026-01-01T14:00:00.000Z'))).toContain('antes');
  });
});
