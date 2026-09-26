import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaCard } from '../index';

let mockIsOff = true;
let mockIsPlaying = false;
let mockArtwork: string | null = null;
let mockElapsedSeconds = 0;
let mockDurationSeconds = 0;
let mockTheme: 'glass' | 'dark' | 'light' = 'glass';

vi.mock('@navet/app/hooks', () => ({
  useTheme: () => ({
    theme: mockTheme,
    colors: {
      media: {
        off: {
          border: 'border-zinc-950',
        },
      },
    },
  }),
  useI18n: () => ({
    t: (key: string) => key,
  }),
  useMediaQuery: () => false,
}));

vi.mock('@navet/app/components/shared/edit-mode-settings-request', () => ({
  useEditModeSettingsRequest: vi.fn(),
}));

vi.mock('../use-media-card-controller', () => ({
  useMediaCardController: () => ({
    albumArt: mockArtwork,
    artworkResource: null,
    clearPlaylist: vi.fn(),
    cycleRepeat: vi.fn(),
    closeDialog: vi.fn(),
    durationSeconds: mockDurationSeconds,
    displayArtist: 'Ready to play',
    displayTitle: 'Living Room TV',
    elapsedSeconds: mockElapsedSeconds,
    handleArtworkError: vi.fn(),
    handleNext: vi.fn(),
    handlePrevious: vi.fn(),
    handleVolumeChange: vi.fn(),
    groupMembers: [],
    isOff: mockIsOff,
    isPlaying: mockIsPlaying,
    isMuted: false,
    isOpen: false,
    mediaCapabilities: {},
    openDialog: vi.fn(),
    remoteAvailable: false,
    repeatMode: 'off',
    seekTo: vi.fn(),
    selectSource: vi.fn(),
    selectSoundMode: vi.fn(),
    availableGroupingPlayers: [],
    attachGroupMember: vi.fn(),
    detachGroupMember: vi.fn(),
    canNextTrack: false,
    canPreviousTrack: false,
    shuffleEnabled: false,
    soundMode: '',
    soundModeList: [],
    source: 'HDMI 1',
    sourceList: ['HDMI 1'],
    supportsGrouping: false,
    startVolumeInteraction: vi.fn(),
    endVolumeInteraction: vi.fn(),
    sendRemoteCommand: vi.fn(),
    toggleTvPower: vi.fn(),
    toggleShuffle: vi.fn(),
    toggleMute: vi.fn(),
    togglePlay: vi.fn(),
    upNextTitle: '',
    volume: 24,
  }),
}));

describe('MediaCard theme surfaces', () => {
  beforeEach(() => {
    mockIsPlaying = false;
    mockArtwork = null;
    mockElapsedSeconds = 0;
    mockDurationSeconds = 0;
    useSettingsStore.setState({ lowPowerMode: false, disableAnimations: false });
  });
  it.each([
    ['playing', true, false, 'playing'],
    ['paused', false, false, 'paused'],
    ['idle', false, false, 'idle'],
    ['off', false, true, 'off'],
  ] as const)('exposes the Lunar %s visual state', (state, playing, off, expected) => {
    mockTheme = 'light';
    mockIsPlaying = playing;
    mockIsOff = off;
    mockArtwork = null;
    const { container } = renderWithProviders(
      <MediaCard
        id="media_player.speaker"
        name="Living Room Speaker"
        room="Living Room"
        title="Midnight City"
        artist="M83"
        deviceClass="speaker"
        state={state}
        volume={40}
        isMuted={false}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
        mediaStackAppearance
        mediaStackVisualVariant="lunar"
      />
    );
    expect(container.querySelector('[data-media-orbit-state]')).toHaveAttribute(
      'data-media-orbit-state',
      expected
    );
    expect(container.querySelector('[data-media-orbit-type="music"]')).toBeInTheDocument();
    expect(container.querySelector('[data-media-has-artwork="false"]')).toBeInTheDocument();
    expect(container.querySelector('.media-orbit-card')).toBeInTheDocument();
    expect(Boolean(container.querySelector('.media-orbit-waveform'))).toBe(playing);
    expect(container.querySelector('[data-media-motion="high"]')).toBeInTheDocument();
    expect(container.querySelector('[data-media-progress-valid="false"]')).toBeInTheDocument();
  });

  it('keeps TV separate and ignores Lunar when stack appearance is absent', () => {
    mockTheme = 'light';
    mockIsPlaying = false;
    mockIsOff = true;
    const tv = renderWithProviders(
      <MediaCard
        id="media_player.tv"
        name="TV"
        room="Living Room"
        title="TV"
        artist=""
        deviceClass="tv"
        state="off"
        volume={0}
        isMuted={false}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
        mediaStackAppearance
        mediaStackVisualVariant="lunar"
      />
    );
    expect(tv.container.querySelector('[data-media-orbit-type="tv"]')).toBeInTheDocument();
    expect(tv.container.querySelector('.media-orbit-waveform')).not.toBeInTheDocument();
    tv.unmount();
    const ordinary = renderWithProviders(
      <MediaCard
        id="media_player.tv"
        name="TV"
        room="Living Room"
        title="TV"
        artist=""
        deviceClass="tv"
        state="off"
        volume={0}
        isMuted={false}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
        mediaStackVisualVariant="lunar"
      />
    );
    expect(ordinary.container.querySelector('.media-orbit-card')).not.toBeInTheDocument();
  });

  it('degrades Lunar motion for low power and disabled animations', () => {
    mockTheme = 'light';
    mockIsOff = false;
    mockIsPlaying = true;
    useSettingsStore.setState({ lowPowerMode: true, disableAnimations: false });
    const low = renderWithProviders(
      <MediaCard
        id="media_player.speaker"
        name="Speaker"
        room="Living Room"
        title="Midnight City"
        artist="M83"
        deviceClass="speaker"
        state="playing"
        volume={40}
        isMuted={false}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
        mediaStackAppearance
        mediaStackVisualVariant="lunar"
      />
    );
    expect(low.container.querySelector('[data-media-motion="low"]')).toBeInTheDocument();
    low.unmount();
    useSettingsStore.setState({ lowPowerMode: false, disableAnimations: true });
    const off = renderWithProviders(
      <MediaCard
        id="media_player.speaker"
        name="Speaker"
        room="Living Room"
        title="Midnight City"
        artist="M83"
        deviceClass="speaker"
        state="playing"
        volume={40}
        isMuted={false}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
        mediaStackAppearance
        mediaStackVisualVariant="lunar"
      />
    );
    expect(off.container.querySelector('[data-media-motion="off"]')).toBeInTheDocument();
    useSettingsStore.setState({ lowPowerMode: false, disableAnimations: false });
  });

  it('keeps existing artwork resolution visible in the Lunar stack', () => {
    mockTheme = 'light';
    mockIsOff = false;
    mockIsPlaying = true;
    mockArtwork = 'data:image/png;base64,artwork';
    const view = renderWithProviders(
      <MediaCard
        id="media_player.speaker"
        name="Speaker"
        room="Living Room"
        title="Midnight City"
        artist="M83"
        deviceClass="speaker"
        state="playing"
        volume={40}
        isMuted={false}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
        mediaStackAppearance
        mediaStackVisualVariant="lunar"
      />
    );
    expect(view.container.querySelector('[data-media-has-artwork="true"]')).toBeInTheDocument();
    expect(view.container.querySelector('[data-media-artwork-surface] img')).toHaveAttribute(
      'src',
      mockArtwork
    );
    const image = view.container.querySelector(
      '[data-media-artwork-surface] img'
    ) as HTMLImageElement;
    fireEvent.error(image);
    expect(image.style.visibility).toBe('hidden');
    fireEvent.load(image);
    expect(image.style.visibility).toBe('visible');
  });

  it('does not present an invalid elapsed position as Lunar progress', () => {
    mockTheme = 'light';
    mockIsOff = false;
    mockElapsedSeconds = Number.NaN;
    mockDurationSeconds = 240;
    const view = renderWithProviders(
      <MediaCard
        id="media_player.speaker"
        name="Speaker"
        room="Living Room"
        title="Midnight City"
        artist="M83"
        deviceClass="speaker"
        state="paused"
        volume={40}
        isMuted={false}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
        mediaStackAppearance
        mediaStackVisualVariant="lunar"
      />
    );
    expect(view.container.querySelector('[data-media-progress-valid="false"]')).toBeInTheDocument();
  });
  it('keeps glass TV cards on the shared glass border instead of a dark media-off border', () => {
    mockIsOff = true;
    mockTheme = 'glass';

    const { container } = renderWithProviders(
      <MediaCard
        id="media_player.living_room_tv"
        name="Living Room TV"
        room="Living Room"
        title="Living Room TV"
        artist="Ready to play"
        deviceClass="tv"
        state="off"
        volume={24}
        isMuted={false}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    const card = container.firstElementChild;
    expect(card).not.toBeNull();
    expect(card).toHaveClass('border-white/22');
    expect(card).not.toHaveClass('border-zinc-950');
  });

  it('uses a stronger glass shell tint when the TV card is on', () => {
    mockIsOff = false;
    mockTheme = 'glass';

    const { container } = renderWithProviders(
      <MediaCard
        id="media_player.living_room_tv"
        name="Living Room TV"
        room="Living Room"
        title="Living Room TV"
        artist="Ready to play"
        deviceClass="tv"
        state="playing"
        volume={24}
        isMuted={false}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    const card = container.firstElementChild;
    expect(card).not.toBeNull();
    expect(card).toHaveClass('border-fuchsia-400/20');
    expect(card).toHaveStyle({
      background:
        'linear-gradient(135deg, rgba(217,70,239,0.34) 0%, rgba(126,34,206,0.2) 52%, rgba(255,255,255,0.08) 100%)',
      borderColor: 'rgba(244,114,182,0.38)',
    });
  });

  it('keeps the active TV shell gradient in dark theme', () => {
    mockIsOff = false;
    mockTheme = 'dark';

    const { container } = renderWithProviders(
      <MediaCard
        id="media_player.living_room_tv"
        name="Living Room TV"
        room="Living Room"
        title="Living Room TV"
        artist="Ready to play"
        deviceClass="tv"
        state="playing"
        volume={24}
        isMuted={false}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    const card = container.firstElementChild;
    expect(card).not.toBeNull();
    expect(card).toHaveClass(
      'bg-gradient-to-br',
      'from-violet-950/90',
      'via-fuchsia-950/75',
      'to-zinc-950'
    );
    expect(card).toHaveClass('border-fuchsia-500/25');
  });
});
