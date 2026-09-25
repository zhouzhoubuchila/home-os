import { zhMessages } from '@navet/app/i18n/messages/zh';
import { describe, expect, it } from 'vitest';
import { resolveVacuumCardSummary } from '../vacuum-card-summary';
import { normalizeVacuumStatus } from '../vacuum-utils';

const t = (key: string) => zhMessages[key as keyof typeof zhMessages] ?? key;

describe('Chinese vacuum status summary', () => {
  it.each([
    ['Sleeping', '待机'],
    ['cleaning', '清扫中'],
    ['returning', '回充中'],
    ['charging', '充电中'],
    ['paused', '暂停'],
    ['error', '异常'],
  ])('localizes raw %s as %s', (rawStatus, expected) => {
    const status = normalizeVacuumStatus(rawStatus, 'idle');
    expect(resolveVacuumCardSummary({ status, t }).primaryText).toBe(expected);
  });

  it('does not expose a raw English status when cleaning a room', () => {
    expect(
      resolveVacuumCardSummary({ status: 'cleaning', currentRoom: 'Kitchen', t }).primaryText
    ).toBe('清扫中 kitchen');
  });
});
