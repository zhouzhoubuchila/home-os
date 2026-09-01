import { dispatchEntityCommand } from '@navet/app/commands';
import { BaseCard, Button } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import {
  AlertTriangle,
  CheckCircle2,
  CircleGauge,
  CloudSun,
  House,
  Lightbulb,
  Moon,
  Network,
  Server,
  Sparkles,
  Users,
  WalletCards,
  Wind,
  Zap,
} from 'lucide-react';
import { Solar } from 'lunar-javascript';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { buildFamilyMembers } from '../../adapters/family-adapter';
import { buildHomeOsLights } from '../../adapters/lighting-adapter';
import { evaluateAlerts } from '../../alerts/alert-engine';
import { DEFAULT_HOME_OS_ALERT_RULES } from '../../alerts/default-rules';
import { getHomeOsCardDefinition, type HomeOsCardKind } from '../../cards/card-registry';
import type { ResolvedSemanticEntity } from '../../core/types';
import { useResolvedHomeOsEntities } from '../../hooks/use-resolved-home-os';
import { getHomeOsCopy } from '../../i18n/home-os-copy';
import { useHomeOsConfigStore } from '../../stores/home-os-config-store';

export interface HomeOsWidgetData {
  kind?: HomeOsCardKind;
}

interface HomeOsWidgetProps {
  size: CardSize;
  data?: HomeOsWidgetData;
  isEditMode: boolean;
}

const sizeLimit = (size: CardSize) => (size === 'small' ? 2 : size === 'medium' ? 4 : 8);
const stateText = (entity: ResolvedSemanticEntity) => {
  const value = entity.entity.primaryState;
  const unit = entity.entity.attributes.unit ?? entity.entity.attributes.unit_of_measurement;
  return `${value ?? '—'}${typeof unit === 'string' && unit ? ` ${unit}` : ''}`;
};
const freshnessText = (updatedAt: string | undefined) => {
  const timestamp = updatedAt ? Date.parse(updatedAt) : Number.NaN;
  if (!Number.isFinite(timestamp)) return 'update time unknown';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'updated now';
  if (minutes < 60) return `${minutes}m ago${minutes >= 15 ? ' · stale' : ''}`;
  return `${Math.round(minutes / 60)}h ago · stale`;
};

function Metrics({
  entities,
  size,
  empty,
}: {
  entities: ResolvedSemanticEntity[];
  size: CardSize;
  empty: string;
}) {
  if (!entities.length) return <p className="text-sm text-current/55">{empty}</p>;
  return (
    <div className="grid min-h-0 gap-2 overflow-hidden">
      {entities.slice(0, sizeLimit(size)).map((item) => (
        <div key={item.entity.canonicalId} className="flex min-w-0 justify-between gap-3 text-sm">
          <span className="min-w-0">
            <span className="block truncate text-current/65">{item.displayName}</span>
            <span className="block truncate text-[0.65rem] text-current/40">
              {freshnessText(item.entity.lastUpdated)}
            </span>
          </span>
          <strong className="shrink-0 tabular-nums">{stateText(item)}</strong>
        </div>
      ))}
    </div>
  );
}

function HouseholdCard({
  size,
  entities,
  title,
  status,
}: {
  size: CardSize;
  entities: ResolvedSemanticEntity[];
  title: string;
  status: string;
}) {
  const members = buildFamilyMembers(entities);
  const homeCount = members.filter((member) => member.state === 'home').length;
  return (
    <BaseCard size={size} title={title} headerLeading={<Users className="h-5 w-5" />}>
      <div className="flex h-full flex-col justify-between gap-3">
        <div>
          <strong className="text-3xl tabular-nums">
            {homeCount}/{members.length}
          </strong>
          <p className="text-sm text-current/55">{status}</p>
        </div>
        <div className="grid gap-1 text-sm">
          {members.slice(0, sizeLimit(size)).map((member) => (
            <div key={member.id} className="flex justify-between gap-2">
              <span className="truncate">{member.name}</span>
              <span className="text-current/60">{member.state}</span>
            </div>
          ))}
        </div>
      </div>
    </BaseCard>
  );
}

function LightingCard({
  size,
  entities,
  isEditMode,
  copy,
}: {
  size: CardSize;
  entities: ResolvedSemanticEntity[];
  isEditMode: boolean;
  copy: ReturnType<typeof getHomeOsCopy>;
}) {
  const lights = buildHomeOsLights(entities);
  const on = lights.filter((light) => light.state === 'on');
  const controllable = lights.filter((light) => light.controllable);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const turnOff = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    try {
      const results = await Promise.allSettled(
        controllable.map((light) =>
          dispatchEntityCommand(
            { type: 'turn_off', entityId: light.sourceEntityId },
            light.providerId
          )
        )
      );
      if (results.some((result) => result.status === 'rejected')) throw new Error();
    } catch {
      toast.error(copy.lightsFailed);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };
  return (
    <BaseCard
      size={size}
      title={copy.wholeHomeLighting}
      headerLeading={<Lightbulb className="h-5 w-5" />}
    >
      <div className="flex h-full flex-col justify-between gap-3">
        <div>
          <strong className="text-3xl tabular-nums">{on.length}</strong>
          <p className="text-sm text-current/55">
            {lights.length} {copy.lightsOn}
          </p>
        </div>
        {size !== 'small' ? (
          <p className="line-clamp-2 text-xs text-current/55">
            {on.map(({ name }) => name).join(' · ') || copy.allLightsOff}
          </p>
        ) : null}
        {!isEditMode && controllable.length ? (
          <Button size="small" variant="secondary" onClick={() => void turnOff()} loading={busy}>
            {confirming ? copy.confirmTurnOff : copy.turnAllOff}
          </Button>
        ) : null}
      </div>
    </BaseCard>
  );
}

function AlertsCard({
  size,
  entities,
  copy,
}: {
  size: CardSize;
  entities: ResolvedSemanticEntity[];
  copy: ReturnType<typeof getHomeOsCopy>;
}) {
  const customRules = useHomeOsConfigStore((state) => state.config.alertRules);
  const rules = useMemo(() => [...DEFAULT_HOME_OS_ALERT_RULES, ...customRules], [customRules]);
  const alerts = evaluateAlerts(entities, rules);
  return (
    <BaseCard
      size={size}
      title={copy.attentionCenter}
      headerLeading={
        alerts.length ? (
          <AlertTriangle className="h-5 w-5 text-amber-400" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        )
      }
    >
      <div className="flex h-full flex-col justify-between gap-3">
        <div>
          <strong className="text-3xl tabular-nums">{alerts.length}</strong>
          <p className="text-sm text-current/55">{copy.activeAlerts}</p>
        </div>
        <div className="grid gap-1 text-xs">
          {alerts.slice(0, sizeLimit(size)).map((alert) => (
            <p
              key={alert.id}
              className={alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}
            >
              {alert.message}
            </p>
          ))}
        </div>
      </div>
    </BaseCard>
  );
}

function ModesCard({
  size,
  entities,
  isEditMode,
  copy,
}: {
  size: CardSize;
  entities: ResolvedSemanticEntity[];
  isEditMode: boolean;
  copy: ReturnType<typeof getHomeOsCopy>;
}) {
  const modes = entities.filter((entity) => !entity.ignored && entity.roles.includes('home.mode'));
  return (
    <BaseCard size={size} title={copy.homeModes} headerLeading={<Sparkles className="h-5 w-5" />}>
      <div className="grid h-full content-start gap-2">
        {modes.slice(0, sizeLimit(size)).map((mode) => (
          <Button
            key={mode.entity.canonicalId}
            size="small"
            variant="secondary"
            disabled={isEditMode || mode.controlPolicy === 'readonly'}
            onClick={() =>
              void dispatchEntityCommand(
                { type: 'turn_on', entityId: mode.entity.externalId },
                mode.entity.providerId
              ).catch(() => toast.error(`Could not activate ${mode.displayName}`))
            }
          >
            {mode.displayName}
          </Button>
        ))}
        {!modes.length ? <p className="text-sm text-current/55">{copy.noModes}</p> : null}
      </div>
    </BaseCard>
  );
}

function LunarCard({ size, title }: { size: CardSize; title: string }) {
  const lunar = Solar.fromDate(new Date()).getLunar();
  return (
    <BaseCard size={size} title={title} headerLeading={<Moon className="h-5 w-5" />}>
      <div className="flex h-full flex-col justify-between gap-2">
        <strong className="line-clamp-2 text-lg">{lunar.toString()}</strong>
        <p className="text-sm text-current/60">
          {lunar.getYearShengXiao()} ·{' '}
          {lunar.getJieQi() || lunar.getNextJieQi()?.getName() || '平日'}
        </p>
        {size !== 'small' ? (
          <div className="text-xs">
            <p className="line-clamp-1 text-emerald-400">
              宜：{lunar.getDayYi().slice(0, 4).join(' · ')}
            </p>
            <p className="line-clamp-1 text-amber-400">
              忌：{lunar.getDayJi().slice(0, 4).join(' · ')}
            </p>
          </div>
        ) : null}
      </div>
    </BaseCard>
  );
}

const ICONS: Record<HomeOsCardKind, typeof Server> = {
  household: Users,
  lighting: Lightbulb,
  alerts: AlertTriangle,
  pve: Server,
  'home-assistant': House,
  router: Network,
  internet: CircleGauge,
  electricity: Zap,
  gas: WalletCards,
  weather: CloudSun,
  'air-quality': Wind,
  calendar: Users,
  modes: Sparkles,
  cleaning: Sparkles,
  lunar: Moon,
};

export function HomeOsWidget({ size, data, isEditMode }: HomeOsWidgetProps) {
  const { language } = useI18n();
  const copy = getHomeOsCopy(language);
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const entities = useResolvedHomeOsEntities();
  const definition = getHomeOsCardDefinition(data?.kind);
  if (!definition) {
    return (
      <BaseCard size={size}>
        <p className="text-sm text-current/55">{copy.chooseCard}</p>
      </BaseCard>
    );
  }
  if (definition.kind === 'household')
    return (
      <HouseholdCard
        size={size}
        entities={entities}
        title={copy.household}
        status={copy.peopleAtHome}
      />
    );
  if (definition.kind === 'lighting')
    return <LightingCard size={size} entities={entities} isEditMode={isEditMode} copy={copy} />;
  if (definition.kind === 'alerts')
    return <AlertsCard size={size} entities={entities} copy={copy} />;
  if (definition.kind === 'modes')
    return <ModesCard size={size} entities={entities} isEditMode={isEditMode} copy={copy} />;
  if (definition.kind === 'lunar') return <LunarCard size={size} title={copy.lunarCalendar} />;
  const matched = entities.filter(
    (entity) =>
      !entity.ignored &&
      entity.displayMode !== 'hidden' &&
      entity.roles.some((role) =>
        definition.semanticRolePrefixes.some((prefix) => role.startsWith(prefix))
      )
  );
  const Icon = ICONS[definition.kind];
  const name = language === 'zh' ? definition.name.zh : definition.name.en;
  return (
    <BaseCard
      size={size}
      title={name.replace('Home OS · ', '')}
      headerLeading={<Icon className="h-5 w-5" />}
    >
      <div className="flex h-full min-h-0 flex-col justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={
              matched.some((item) => item.entity.availability === 'available')
                ? 'h-2 w-2 rounded-full bg-emerald-400'
                : 'h-2 w-2 rounded-full bg-current/30'
            }
          />
          <span className={surface.textSecondary}>
            {matched.length
              ? matched.every((item) => item.entity.availability !== 'available')
                ? copy.unavailable
                : copy.live
              : copy.notConfigured}
          </span>
        </div>
        <Metrics entities={matched} size={size} empty={copy.noMappedData} />
      </div>
    </BaseCard>
  );
}
