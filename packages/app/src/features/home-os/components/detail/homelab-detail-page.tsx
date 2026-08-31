import { TrendSparkline } from '@navet/app/components/charts/trend-sparkline';
import { BaseCard, Heading } from '@navet/app/components/primitives';
import { useSensorStatisticsHistory } from '@navet/app/features/sensors/hooks/use-sensor-statistics-history';
import { useTheme } from '@navet/app/hooks';
import { Activity, House, Network, Server } from 'lucide-react';
import type { ResolvedSemanticEntity } from '../../core/types';
import { useResolvedHomeOsEntities } from '../../hooks/use-resolved-home-os';

function MetricDetailCard({ entity }: { entity: ResolvedSemanticEntity }) {
  const { accentColor } = useTheme();
  const { points, canFetch, hasHistory } = useSensorStatisticsHistory(entity.entity.canonicalId);
  const unit = entity.entity.attributes.unit ?? entity.entity.attributes.unit_of_measurement;
  return (
    <BaseCard
      size="medium"
      title={entity.displayName}
      subtitle={entity.roles[0] ?? 'unmapped'}
      headerLeading={<Activity className="h-5 w-5" />}
    >
      <div className="flex h-full min-h-0 flex-col justify-between gap-3">
        <div>
          <strong className="text-2xl tabular-nums">
            {String(entity.entity.primaryState ?? '—')}
            {typeof unit === 'string' && unit ? ` ${unit}` : ''}
          </strong>
          <p className="mt-1 text-xs text-current/55">
            {entity.entity.availability} · {entity.source}
          </p>
        </div>
        {hasHistory ? (
          <div className="h-20">
            <TrendSparkline
              data={points}
              accentColor={accentColor}
              ariaLabel={`${entity.displayName} history`}
              height={80}
            />
          </div>
        ) : (
          <p className="text-xs text-current/45">
            {canFetch ? 'No recorder statistics for this period.' : 'History is unavailable.'}
          </p>
        )}
      </div>
    </BaseCard>
  );
}

const GROUPS = [
  { id: 'pve', title: 'PVE', prefix: 'homelab.pve.', Icon: Server },
  {
    id: 'home-assistant',
    title: 'Home Assistant',
    prefix: 'homelab.home_assistant.',
    Icon: House,
  },
  { id: 'router', title: 'Router and Internet', prefix: 'network.', Icon: Network },
] as const;

export function HomelabDetailPage() {
  const entities = useResolvedHomeOsEntities().filter(
    (entity) => !entity.ignored && entity.displayMode !== 'hidden'
  );
  return (
    <div className="space-y-8">
      <header className="space-y-1 px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-current/55">
          Home OS · Detail
        </p>
        <Heading as="h1">Homelab</Heading>
        <p className="max-w-3xl text-sm text-current/65">
          Live normalized metrics with recorder history when the active provider supports it.
        </p>
      </header>
      {GROUPS.map(({ id, title, prefix, Icon }) => {
        const matched = entities.filter((entity) =>
          entity.roles.some((role) => role.startsWith(prefix))
        );
        return (
          <section key={id} className="space-y-3" aria-labelledby={`home-os-${id}-title`}>
            <div className="flex items-center gap-2 px-1">
              <Icon className="h-5 w-5" aria-hidden="true" />
              <h2 id={`home-os-${id}-title`} className="text-lg font-semibold">
                {title}
              </h2>
            </div>
            {matched.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {matched.map((entity) => (
                  <MetricDetailCard key={entity.entity.canonicalId} entity={entity} />
                ))}
              </div>
            ) : (
              <BaseCard size="small">
                <p className="text-sm text-current/55">No mapped {title} metrics.</p>
              </BaseCard>
            )}
          </section>
        );
      })}
    </div>
  );
}
