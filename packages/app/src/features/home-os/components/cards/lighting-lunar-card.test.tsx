import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedSemanticEntity } from '../../core/types';
import { getHomeOsCopy } from '../../i18n/home-os-copy';
import { resolveSemanticEntities } from '../../mapping/semantic-resolver';
import { useHomeOsConfigStore } from '../../stores/home-os-config-store';
import { homeOsEntity } from '../../tests/fixtures';
import { LightingCard } from './home-os-widget';

const { dispatchEntityCommandMock } = vi.hoisted(() => ({
  dispatchEntityCommandMock: vi.fn(() => Promise.resolve()),
}));

vi.mock('@navet/app/commands', () => ({ dispatchEntityCommand: dispatchEntityCommandMock }));

const copy = getHomeOsCopy('zh');
const light = (id: string, name: string, state = 'on') =>
  homeOsEntity({ externalId: id, name, primaryState: state, capabilities: ['toggle'] });
const entities = (...items: ReturnType<typeof homeOsEntity>[]): ResolvedSemanticEntity[] =>
  resolveSemanticEntities(items);

function show(size: 'small' | 'medium' | 'large', items: ResolvedSemanticEntity[]) {
  return renderWithProviders(
    <LightingCard size={size} entities={items} isEditMode={false} copy={copy} />
  );
}

describe('Lunar Series whole-home lighting card', () => {
  beforeEach(() => {
    dispatchEntityCommandMock.mockReset();
    dispatchEntityCommandMock.mockImplementation(() => Promise.resolve());
    const config = useHomeOsConfigStore.getState().config;
    useHomeOsConfigStore.setState({ config: { ...config, functionalDevices: [] } });
  });

  it('shows a calm zero state and an explicit all-off message', () => {
    const { container } = show('medium', entities(light('light.living', '客厅灯', 'off')));
    expect(container.querySelector('.lighting-lunar-card')).toHaveAttribute(
      'data-lighting-on',
      'false'
    );
    expect(screen.getByText('0 盏灯已开启')).toBeInTheDocument();
    expect(screen.getByText('所有灯光已关闭')).toBeInTheDocument();
  });

  it('counts one and multiple reliable lights, limiting the medium list to three', () => {
    const lights = entities(
      light('light.living', '客厅主灯'),
      light('light.dining', '餐厅灯'),
      light('light.bedside', '床头灯'),
      light('light.study', '书房灯')
    );
    const { container, rerender } = show('medium', lights.slice(0, 1));
    expect(screen.getByText('1 盏灯已开启')).toBeInTheDocument();
    rerender(<LightingCard size="medium" entities={lights} isEditMode={false} copy={copy} />);
    expect(screen.getByText('4 盏灯已开启')).toBeInTheDocument();
    expect(container.querySelectorAll('.lighting-lunar-list span')).toHaveLength(3);
    expect(container.querySelector('.lighting-lunar-card')).toHaveAttribute(
      'data-lighting-on',
      'true'
    );
  });

  it('excludes unavailable and device-only lights from the active count', () => {
    const { container } = show(
      'medium',
      entities(
        light('light.living', '客厅主灯'),
        light('light.unavailable', '不可用灯', 'unavailable'),
        light('light.fridge', '冰箱灯'),
        light('light.status_indicator', '设备状态 LED'),
        light('light.screen_backlight', '屏幕背光')
      )
    );
    expect(screen.getByText('1 盏灯已开启')).toBeInTheDocument();
    expect(container.querySelectorAll('.lighting-lunar-list span')).toHaveLength(1);
    expect(screen.queryByText('冰箱灯')).not.toBeInTheDocument();
  });

  it('does not count a circuit without a reliable state source', () => {
    const config = useHomeOsConfigStore.getState().config;
    useHomeOsConfigStore.setState({
      config: {
        ...config,
        functionalDevices: [
          {
            id: 'unknown-light',
            kind: 'light',
            name: '未知状态灯',
            controls: { toggle: 'switch.unknown_light' },
            metrics: {},
            sourceEntityIds: ['switch.unknown_light'],
            manual: true,
          },
        ],
      },
    });
    show(
      'medium',
      entities(
        homeOsEntity({
          externalId: 'switch.unknown_light',
          name: '未知状态灯',
          primaryState: 'on',
          capabilities: ['toggle'],
        })
      )
    );
    expect(screen.getByText('0 盏灯已开启')).toBeInTheDocument();
  });

  it('shows only number, state and action on small; more names on large', () => {
    const lights = entities(
      light('light.living', '客厅主灯'),
      light('light.dining', '餐厅灯'),
      light('light.bedside', '床头灯'),
      light('light.study', '书房灯')
    );
    const { container, rerender } = show('small', lights);
    expect(container.querySelector('.lighting-lunar-list')).toBeNull();
    expect(screen.getByRole('button', { name: '全部关闭' })).toBeInTheDocument();
    rerender(<LightingCard size="large" entities={lights} isEditMode={false} copy={copy} />);
    expect(container.querySelectorAll('.lighting-lunar-list span')).toHaveLength(4);
  });

  it('requires confirmation before dispatching whole-home off actions', async () => {
    const { container } = show('medium', entities(light('light.living', '客厅主灯')));
    fireEvent.click(screen.getByRole('button', { name: '全部关闭' }));
    expect(dispatchEntityCommandMock).not.toHaveBeenCalled();
    expect(container.querySelector('.lighting-lunar-card')).toHaveAttribute(
      'data-lighting-confirming',
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: '确认关闭' }));
    await waitFor(() => expect(dispatchEntityCommandMock).toHaveBeenCalledTimes(1));
    expect(dispatchEntityCommandMock).toHaveBeenCalledWith(
      { type: 'turn_off', entityId: 'light.living' },
      'home_assistant'
    );
  });

  it('keeps the button busy until the existing command settles', async () => {
    let release: (() => void) | undefined;
    dispatchEntityCommandMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );
    const { container } = show('medium', entities(light('light.living', '客厅主灯')));
    fireEvent.click(screen.getByRole('button', { name: '全部关闭' }));
    fireEvent.click(screen.getByRole('button', { name: '确认关闭' }));
    expect(container.querySelector('.lighting-lunar-card')).toHaveAttribute(
      'data-lighting-busy',
      'true'
    );
    expect(screen.getByRole('button', { name: '确认关闭' })).toBeDisabled();
    release?.();
    await waitFor(() =>
      expect(container.querySelector('.lighting-lunar-card')).toHaveAttribute(
        'data-lighting-busy',
        'false'
      )
    );
  });
});
