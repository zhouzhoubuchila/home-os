import type { CSSProperties, SVGProps } from 'react';

interface WeatherSunTimesProps {
  sunrise: string;
  sunset: string;
  daylight: string;
  textPrimary?: string;
  textSecondary: string;
  textShadow?: string;
  titleStyle: CSSProperties;
  subtitleStyle: CSSProperties;
  iconStyleSecondary: CSSProperties;
}

function SunriseIcon({ className, style }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 16.5h18" stroke="#8FD8F5" strokeLinecap="round" strokeWidth="1.8" />
      <path
        d="M6.5 16.2a5.5 5.5 0 0 1 11 0"
        fill="#78B9EB"
        stroke="#4F7FD2"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
      <path
        d="M12 4.5v4M7 7.2l2.2 2.2M17 7.2l-2.2 2.2M12 4.5l-2 2M12 4.5l2 2"
        stroke="#D9E8FF"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
      <path d="M5 19h14" stroke="#93C5FD" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function SunsetIcon({ className, style }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 16.5h18" stroke="#7567C9" strokeLinecap="round" strokeWidth="1.8" />
      <path
        d="M6.5 16.2a5.5 5.5 0 0 1 11 0"
        fill="#4F7FD2"
        stroke="#334B8C"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
      <path
        d="M12 9V5M7 7.2l2.2 2.2M17 7.2l-2.2 2.2M12 9l-2-2M12 9l2-2"
        stroke="#BFD8FF"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
      <path d="M5 19h14" stroke="#A5B4FC" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export function WeatherSunTimes({
  sunrise,
  sunset,
  daylight,
  textSecondary,
  titleStyle,
  subtitleStyle,
  iconStyleSecondary,
}: WeatherSunTimesProps) {
  return (
    <div className="my-5 flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <SunriseIcon className="h-5 w-5" style={iconStyleSecondary} />
        <span className="text-sm font-medium" style={titleStyle}>
          {sunrise}
        </span>
      </div>
      <div className="mx-3 flex min-w-0 flex-1 items-center">
        <div className="flex-1 border-t border-dashed" style={{ borderColor: textSecondary }} />
      </div>
      <div className="shrink-0 text-sm" style={subtitleStyle}>
        {daylight}
      </div>
      <div className="mx-3 flex min-w-0 flex-1 items-center">
        <div className="flex-1 border-t border-dashed" style={{ borderColor: textSecondary }} />
      </div>
      <div className="flex items-center gap-2">
        <SunsetIcon className="h-5 w-5" style={iconStyleSecondary} />
        <span className="text-sm font-medium" style={titleStyle}>
          {sunset}
        </span>
      </div>
    </div>
  );
}
