import { TrendSparkline } from '@navet/app/components/charts/trend-sparkline';
import { BaseCard, Heading } from '@navet/app/components/primitives';
import { useSensorStatisticsHistory } from '@navet/app/features/sensors/hooks/use-sensor-statistics-history';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Activity, House, Network, Server } from 'lucide-react';
import type { ResolvedSemanticEntity } from '../../core/types';
import { useResolvedHomeOsEntities } from '../../hooks/use-resolved-home-os';
import { getHomeOsCopy } from '../../i18n/home-os-copy';

function MetricDetailCard({
  entity,
  language,
  copy,
}: {
  entity: ResolvedSemanticEntity;
  language: string;
  copy: ReturnType<typeof getHomeOsCopy>;
}) {
  const { accentColor } = useTheme();
  const { points, canFetch, hasHistory } = useSensorStatisticsHistory(entity.entity.canonicalId);
  const unit = entity.entity.attributes.unit ?? entity.entity.attributes.unit_of_measurement;
  return (
    <BaseCard
      size="medium"
      title={entity.displayName}
      subtitle={entity.roles[0] ?? copy.unmapped}
      headerLeading={<Activity className="h-5 w-5" />}
    >
      <div className="flex h-full min-h-0 flex-col justify-between gap-3">
        <div>
          <strong className="text-2xl tabular-nums">
            {String(entity.entity.primaryState ?? '—')}
            {typeof unit === 'string' && unit ? ` ${unit}` : ''}
          </strong>
          <p className="mt-1 text-xs text-current/55">
            {entity.entity.availability === 'available' ? copy.live : copy.unavailable} ·{' '}
            {entity.source === 'manual' ? copy.manual : copy.autoRole}
          </p>
        </div>
        {hasHistory ? (
          <div className="h-20">
            <TrendSparkline
              data={points}
              accentColor={accentColor}
              ariaLabel={`${entity.displayName} ${language === 'zh' ? '历史' : 'history'}`}
              height={80}
            />
          </div>
        ) : (
          <p className="text-xs text-current/45">
            {canFetch
              ? language === 'zh'
                ? '此时间段没有 Recorder 统计数据。'
                : 'No recorder statistics for this period.'
              : copy.historyUnavailable}
          </p>
        )}
      </div>
    </BaseCard>
  );
}

const GROUPS = [
  { id: 'pve', nameText: 'PVE', prefix: 'homelab.pve.', Icon: Server },
  {
    id: 'home-assistant',
    nameText: 'Home Assistant',
    prefix: 'homelab.home_assistant.',
    Icon: House,
  },
  { id: 'router', nameText: 'Router and Internet', prefix: 'network.', Icon: Network },
] as const;

export function HomelabDetailPage() {
  const { language } = useI18n();
  const copy = getHomeOsCopy(language);
  const entities = useResolvedHomeOsEntities().filter(
    (entity) => !entity.ignored && entity.displayMode !== 'hidden'
  );
  return (
    <div className="space-y-8">
      <header className="space-y-1 px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-current/55">
          {copy.detailEyebrow}
        </p>
        <Heading as="h1">{copy.homelab}</Heading>
        <p className="max-w-3xl text-sm text-current/65">{copy.homelabDescription}</p>
      </header>
      {GROUPS.map(({ id, nameText, prefix, Icon }) => {
        const matched = entities.filter((entity) =>
          entity.roles.some((role) => role.startsWith(prefix))
        );
        return (
          <section key={id} className="space-y-3" aria-labelledby={`home-os-${id}-title`}>
            <div className="flex items-center gap-2 px-1">
              <Icon className="h-5 w-5" aria-hidden="true" />
              <h2 id={`home-os-${id}-title`} className="text-lg font-semibold">
                {language === 'zh' && id === 'router' ? '路由器与互联网' : nameText}
              </h2>
            </div>
            {matched.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {matched.map((entity) => (
                  <MetricDetailCard
                    key={entity.entity.canonicalId}
                    entity={entity}
                    language={language}
                    copy={copy}
                  />
                ))}
              </div>
            ) : (
              <BaseCard size="small">
                <p className="text-sm text-current/55">{copy.noMappedMetrics}</p>
              </BaseCard>
            )}
          </section>
        );
      })}
    </div>
  );
}
