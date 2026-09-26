interface MediaOrbitLayerProps {
  showWaveform: boolean;
}

/** Decorative playback-state indicator; it does not represent sampled audio. */
export function MediaOrbitLayer({ showWaveform }: MediaOrbitLayerProps) {
  return (
    <div
      className="media-orbit-layer pointer-events-none absolute inset-0 z-[3]"
      aria-hidden="true"
    >
      <div className="media-orbit-atmosphere" />
      <div className="media-orbit-rings">
        <span className="media-orbit-ring media-orbit-ring-outer">
          <span className="media-orbit-node media-orbit-node-one" />
        </span>
        <span className="media-orbit-ring media-orbit-ring-inner">
          <span className="media-orbit-node media-orbit-node-two" />
        </span>
      </div>
      {showWaveform ? (
        <div className="media-orbit-waveform">
          {Array.from({ length: 10 }, (_, index) => (
            <span key={index} style={{ animationDelay: `${-index * 0.19}s` }} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
