import { useEffect, useId, useRef } from 'react';

/** React lifecycle adapter for upstream <lunar-star-particles>. */
export default function LunarStarfield({ density: _density }: { density?: 'medium' | 'large' }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = `lunar-${useId().replaceAll(':', '')}`;

  useEffect(() => {
    let disposed = false;
    let container: Awaited<ReturnType<typeof import('@tsparticles/engine').tsParticles.load>>;
    void Promise.all([import('@tsparticles/engine'), import('@tsparticles/preset-stars')]).then(
      async ([engine, preset]) => {
        if (disposed || !ref.current) return;
        await preset.loadStarsPreset(engine.tsParticles);
        if (disposed || !ref.current) return;
        container = await engine.tsParticles.load({
          id,
          element: ref.current,
          options: {
            preset: 'stars',
            autoPlay: true,
            background: { opacity: 1, color: { value: 'transparent' } },
            clear: true,
            delay: 0,
            fullScreen: { enable: false, zIndex: -1 },
            detectRetina: true,
            duration: 0,
            fpsLimit: 120,
            particles: {
              move: {
                angle: { offset: 0, value: 90 },
                direction: 'none',
                enable: true,
                outModes: { default: 'out' },
                random: false,
                speed: { min: 0.1, max: 1 },
                straight: false,
              },
              number: { density: { enable: true, width: 1920, height: 1080 }, value: 160 },
              opacity: {
                value: { min: 0.1, max: 0.5 },
                animation: { enable: true, speed: 1, startValue: 'random', sync: false },
              },
              shape: { type: 'circle' },
              size: { value: { min: 1, max: 3 } },
              zIndex: { value: 0, opacityRate: 1, sizeRate: 1, velocityRate: 1 },
              repulse: { value: 0, enabled: true, distance: 1, duration: 1, factor: 1, speed: 1 },
            },
            pauseOnBlur: true,
            pauseOnOutsideViewport: true,
            smooth: true,
            zLayers: 100,
            motion: { disable: false, reduce: { factor: 4, value: true } },
          },
        });
      }
    );
    return () => {
      disposed = true;
      container?.destroy();
    };
  }, [id]);

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-0" data-lunar-starfield />
  );
}
