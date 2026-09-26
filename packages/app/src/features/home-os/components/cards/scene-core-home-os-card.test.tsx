import { dispatchEntityCommand } from '@navet/app/commands';
import { renderWithProviders } from '@navet/app/test/render';
import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveSemanticEntities } from '../../mapping/semantic-resolver';
import { homeOsEntity } from '../../tests/fixtures';
import { HomeOsWidget } from './home-os-widget';
import { SceneCoreHomeOsCard } from './scene-core-home-os-card';
import { buildSceneCoreModel } from './scene-core-model';

vi.mock('@navet/app/commands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@navet/app/commands')>()),
  dispatchEntityCommand: vi.fn(),
}));

const scenes = resolveSemanticEntities(
  Array.from({ length: 9 }, (_, index) =>
    homeOsEntity({
      externalId: `scene.mode_${index}`,
      providerId: 'home_assistant',
      type: 'scene',
      name: index === 0 ? '观影' : `Scene ${index}`,
    })
  )
);

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('Scene Core', () => {
  it('routes the modes registry kind to Scene Core', () => {
    const { container } = renderWithProviders(
      <HomeOsWidget size="medium" data={{ kind: 'modes' }} isEditMode />
    );
    expect(container.querySelector('.scene-core-card')).toBeInTheDocument();
  });

  it('keeps only home.mode scenes in provider order with size limits and +N', () => {
    const mixed = [
      ...scenes,
      ...resolveSemanticEntities([homeOsEntity({ externalId: 'light.study', type: 'light' })]),
    ];
    expect(buildSceneCoreModel(mixed, 'small')).toMatchObject({ total: 9, remaining: 7 });
    expect(buildSceneCoreModel(mixed, 'medium')).toMatchObject({ total: 9, remaining: 5 });
    expect(buildSceneCoreModel(mixed, 'large')).toMatchObject({ total: 9, remaining: 1 });
    expect(buildSceneCoreModel(mixed, 'small').scenes[0]?.displayName).toBe('观影');
    const { container } = renderWithProviders(
      <SceneCoreHomeOsCard
        size="small"
        entities={mixed}
        isEditMode={false}
        language="zh"
        title="家庭模式"
      />
    );
    expect(screen.getByRole('button', { name: '观影' })).toBeInTheDocument();
    expect(container.querySelectorAll('.scene-core-action')).toHaveLength(2);
    expect(screen.getByText('+7')).toBeInTheDocument();
    expect(container.querySelector('[data-scene-motion]')).toBeInTheDocument();
  });

  it('disables readonly scenes and edit-mode controls', () => {
    const readonly = [{ ...scenes[0], controlPolicy: 'readonly' as const }];
    const { rerender } = renderWithProviders(
      <SceneCoreHomeOsCard
        size="medium"
        entities={readonly}
        isEditMode={false}
        language="zh"
        title="家庭模式"
      />
    );
    expect(screen.getByRole('button', { name: '观影' })).toBeDisabled();
    rerender(
      <SceneCoreHomeOsCard
        size="medium"
        entities={[scenes[0]]}
        isEditMode
        language="zh"
        title="家庭模式"
      />
    );
    expect(screen.getByRole('button', { name: '观影' })).toBeDisabled();
    expect(dispatchEntityCommand).not.toHaveBeenCalled();
  });

  it('dispatches through the provider, shows temporary success, and never claims a current mode', async () => {
    vi.mocked(dispatchEntityCommand).mockResolvedValue({
      accepted: true,
      requiresEventConfirmation: true,
    });
    const { container } = renderWithProviders(
      <SceneCoreHomeOsCard
        size="medium"
        entities={[scenes[0]]}
        isEditMode={false}
        language="zh"
        title="家庭模式"
      />
    );
    vi.useFakeTimers();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '观影' })));
    expect(dispatchEntityCommand).toHaveBeenCalledWith(
      { type: 'turn_on', entityId: 'scene.mode_0' },
      'home_assistant'
    );
    expect(container.querySelector('[data-scene-feedback="success"]')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2500));
    expect(container.querySelector('[data-scene-feedback="idle"]')).toBeInTheDocument();
    expect(container).not.toHaveTextContent('当前模式');
  });

  it('shows an error state without persisting it', async () => {
    vi.mocked(dispatchEntityCommand).mockRejectedValue(new Error('offline'));
    const { container } = renderWithProviders(
      <SceneCoreHomeOsCard
        size="medium"
        entities={[scenes[0]]}
        isEditMode={false}
        language="zh"
        title="家庭模式"
      />
    );
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '观影' })));
    expect(container.querySelector('[data-scene-feedback="error"]')).toBeInTheDocument();
  });

  it('treats a rejected command result as an error', async () => {
    vi.mocked(dispatchEntityCommand).mockResolvedValue({
      accepted: false,
      requiresEventConfirmation: false,
    });
    const { container } = renderWithProviders(
      <SceneCoreHomeOsCard
        size="medium"
        entities={[scenes[0]]}
        isEditMode={false}
        language="en"
        title="Home modes"
      />
    );
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '观影' })));
    expect(container.querySelector('[data-scene-feedback="error"]')).toBeInTheDocument();
  });

  it('renders a real empty state instead of invented scenes', () => {
    renderWithProviders(
      <SceneCoreHomeOsCard
        size="large"
        entities={[]}
        isEditMode={false}
        language="zh"
        title="家庭模式"
      />
    );
    expect(screen.getByText('暂无家庭模式')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '回家' })).not.toBeInTheDocument();
  });
});
