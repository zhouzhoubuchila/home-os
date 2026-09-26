import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaCard } from '../index';

const openDialogMock = vi.fn();
const toggleTvPowerMock = vi.fn();
const togglePlayMock = vi.fn();
const handleNextMock = vi.fn();
const handlePreviousMock = vi.fn();

vi.mock('@navet/app/components/shared/edit-mode-settings-request', () => ({
  useEditModeSettingsRequest: vi.fn(),
}));

vi.mock('../use-media-card-controller', () => ({
  useMediaCardController: () => ({
    albumArt: null,
    artworkResource: null,
    clearPlaylist: vi.fn(),
    cycleRepeat: vi.fn(),
    closeDialog: vi.fn(),
    durationSeconds: 0,
    displayArtist: 'Ready to play',
    displayTitle: 'Living Room Speaker',
    elapsedSeconds: 0,
    handleArtworkError: vi.fn(),
    handleNext: handleNextMock,
    handlePrevious: handlePreviousMock,
    handleVolumeChange: vi.fn(),
    groupMembers: [],
    isOff: false,
    isPlaying: false,
    isMuted: false,
    isOpen: false,
    mediaCapabilities: {
      canRepeat: true,
      canShuffle: true,
    },
    openDialog: openDialogMock,
    remoteAvailable: false,
    repeatMode: 'off',
    seekTo: vi.fn(),
    selectSource: vi.fn(),
    selectSoundMode: vi.fn(),
    availableGroupingPlayers: [],
    attachGroupMember: vi.fn(),
    detachGroupMember: vi.fn(),
    canNextTrack: true,
    canPreviousTrack: true,
    canTogglePlayback: true,
    shuffleEnabled: false,
    soundMode: '',
    soundModeList: [],
    source: 'Spotify',
    sourceList: ['Spotify'],
    supportsGrouping: false,
    startVolumeInteraction: vi.fn(),
    endVolumeInteraction: vi.fn(),
    sendRemoteCommand: vi.fn(),
    toggleTvPower: toggleTvPowerMock,
    toggleShuffle: vi.fn(),
    toggleMute: vi.fn(),
    togglePlay: togglePlayMock,
    upNextTitle: '',
    volume: 24,
  }),
}));

describe('MediaCard interactions', () => {
  beforeEach(() => {
    openDialogMock.mockClear();
    toggleTvPowerMock.mockClear();
  });
  it('keeps transport and dialog handlers in the Lunar stack variant', () => {
    togglePlayMock.mockClear();
    handleNextMock.mockClear();
    handlePreviousMock.mockClear();
    openDialogMock.mockClear();
    const view = renderWithProviders(
      <MediaCard
        id="media_player.living_room_speaker"
        name="Living Room Speaker"
        room="Living Room"
        title="Midnight City"
        artist="M83"
        entityType="Speaker"
        deviceClass="speaker"
        state="paused"
        volume={24}
        isMuted={false}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
        mediaStackAppearance
        mediaStackVisualVariant="lunar"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /resume playback/i }));
    fireEvent.click(screen.getByRole('button', { name: /next track/i }));
    fireEvent.click(screen.getByRole('button', { name: /previous track/i }));
    fireEvent.click(view.container.querySelector('.media-orbit-card') as Element);
    expect(togglePlayMock).toHaveBeenCalledTimes(1);
    expect(handleNextMock).toHaveBeenCalledTimes(1);
    expect(handlePreviousMock).toHaveBeenCalledTimes(1);
    expect(openDialogMock).toHaveBeenCalledTimes(1);
  });

  it('keeps Lunar Small focused on play without a volume slider', () => {
    renderWithProviders(
      <MediaCard
        id="media_player.living_room_speaker"
        name="Living Room Speaker"
        room="Living Room"
        title="Midnight City"
        artist="M83"
        deviceClass="speaker"
        state="paused"
        volume={24}
        isMuted={false}
        size="small"
        onSizeChange={vi.fn()}
        isEditMode={false}
        mediaStackAppearance
        mediaStackVisualVariant="lunar"
      />
    );
    expect(screen.getByRole('button', { name: /resume playback/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /volume/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: /volume/i })).not.toBeInTheDocument();
  });
  it('keeps the seek slider visible for idle medium cards', () => {
    renderWithProviders(
      <MediaCard
        id="media_player.living_room_speaker"
        name="Living Room Speaker"
        room="Living Room"
        title="Ready to play"
        artist="Spotify"
        entityType="Speaker"
        deviceClass="speaker"
        state="idle"
        volume={24}
        isMuted={false}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(screen.getByRole('slider', { name: /seek/i })).toBeInTheDocument();
    expect(screen.getAllByRole('slider')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /linear playback/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: /repeat off/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('opens the media dialog when a speaker card is clicked', () => {
    const { container } = renderWithProviders(
      <MediaCard
        id="media_player.living_room_speaker"
        name="Living Room Speaker"
        room="Living Room"
        title="Ready to play"
        artist="Spotify"
        entityType="Speaker"
        deviceClass="speaker"
        state="idle"
        volume={24}
        isMuted={false}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    const card = container.firstElementChild;
    expect(card).not.toBeNull();

    fireEvent.click(card as Element);

    expect(openDialogMock).toHaveBeenCalledTimes(1);
    expect(toggleTvPowerMock).not.toHaveBeenCalled();
  });
});
