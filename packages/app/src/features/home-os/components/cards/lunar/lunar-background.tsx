import { getLunarBackgroundAsset, type LunarBackgroundVariant } from './lunar-background-assets';

/** Direct background layer matching lunar-phase-card's cover/center image. */
export function LunarBackground({
  variant = 'bg0',
  customBackground,
}: {
  variant?: LunarBackgroundVariant;
  customBackground?: string;
}) {
  const source = customBackground ?? getLunarBackgroundAsset(variant);
  if (!source) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
      data-lunar-background-image={customBackground ? 'custom' : variant}
      style={{
        backgroundImage: `url(${source})`,
        boxShadow: 'none',
      }}
    />
  );
}
