import { resolveResource } from '@navet/app/services/integration-resource.service';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FamilyMember } from '../adapters/family-adapter';
import { HouseholdMemberAvatar } from '../components/cards/household-member-avatar';

vi.mock('@navet/app/services/integration-resource.service', () => ({
  resolveResource: vi.fn(),
}));

const resolveResourceMock = vi.mocked(resolveResource);

const member = (overrides: Partial<FamilyMember> = {}): FamilyMember => ({
  id: 'li-li',
  name: '粒粒',
  personEntityId: 'person.li_li',
  providerId: 'home_assistant',
  trackerEntityIds: [],
  state: 'home',
  trackerSources: [],
  ...overrides,
});

const imageResource = (url: string) => ({
  id: 'person.li_li',
  kind: 'image' as const,
  url,
  cacheKey: url,
  authStrategy: 'same_origin' as const,
});

describe('HouseholdMemberAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the member initial when no avatar is available', () => {
    const html = renderToStaticMarkup(<HouseholdMemberAvatar member={member()} size="small" />);
    expect(html).toContain('粒');
    expect(html).not.toContain('<img');
  });

  it('resolves an HA relative avatar through the provider resource resolver', async () => {
    resolveResourceMock.mockResolvedValue(imageResource('/__navet_ha_proxy__/api/image/abc'));
    const view = renderWithProviders(
      <HouseholdMemberAvatar member={member({ avatar: '/api/image/abc' })} size="detail" />
    );

    await waitFor(() => expect(view.container.querySelector('img')).not.toBeNull());
    expect(view.container.querySelector('img')).toHaveAttribute(
      'src',
      '/__navet_ha_proxy__/api/image/abc'
    );
    expect(resolveResourceMock).toHaveBeenCalledWith(
      'person.li_li',
      'primary_image',
      expect.objectContaining({
        attrs: { entity_picture: '/api/image/abc' },
        fallbackPicture: '/api/image/abc',
        providerId: 'home_assistant',
      })
    );
  });

  it('passes non-HA providers to the same resolver without constructing an HA URL', async () => {
    resolveResourceMock.mockResolvedValue(imageResource('https://homey.example/avatar.jpg'));
    const view = renderWithProviders(
      <HouseholdMemberAvatar
        member={member({ providerId: 'homey', avatar: 'https://homey.example/avatar.jpg' })}
        size="small"
      />
    );

    await waitFor(() => expect(view.container.querySelector('img')).not.toBeNull());
    expect(resolveResourceMock).toHaveBeenCalledWith(
      'person.li_li',
      'primary_image',
      expect.objectContaining({ providerId: 'homey' })
    );
  });

  it('keeps the initial when the resolved image fails to load', async () => {
    resolveResourceMock.mockResolvedValue(imageResource('/__navet_ha_proxy__/api/image/abc'));
    const view = renderWithProviders(
      <HouseholdMemberAvatar member={member({ avatar: '/api/image/abc' })} size="small" />
    );

    await waitFor(() => expect(view.container.querySelector('img')).not.toBeNull());
    fireEvent.error(view.container.querySelector('img') as HTMLImageElement);
    expect(view.container.querySelector('img')).toBeNull();
    expect(view.container.textContent).toContain('粒');
  });
});
