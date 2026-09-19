import { useEffect, useId, useRef } from 'react';

export default function LunarStarfield({ density }: { density: 'medium' | 'large' }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = `lunar-${useId().replaceAll(':', '')}`;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
            background: { color: { value: 'transparent' }, opacity: 0 },
            fullScreen: { enable: false },
            fpsLimit: 60,
            particles: {
              number: { value: density === 'large' ? 64 : 28, density: { enable: true } },
              move: { enable: true, speed: { min: 0.08, max: 0.45 }, direction: 'none' },
              opacity: { value: { min: 0.08, max: 0.38 }, animation: { enable: true, speed: 0.5 } },
              size: { value: { min: 0.6, max: 1.8 } },
            },
            pauseOnBlur: true,
            pauseOnOutsideViewport: true,
            detectRetina: true,
            motion: { disable: false, reduce: { factor: 4, value: true } },
          },
        });
      }
    );
    return () => {
      disposed = true;
      container?.destroy();
    };
  }, [density, id]);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 opacity-70"
      data-lunar-starfield
    />
  );
}
