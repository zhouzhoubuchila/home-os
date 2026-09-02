import { dispatchEntityCommand } from '@navet/app/commands';
import { BaseCard, Button } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import { useNavigationStore } from '@navet/app/stores';
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
import { type ReactNode, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { buildFamilyMembers } from '../../adapters/family-adapter';
import { buildHomeOsLights, getWholeHomeLightActions } from '../../adapters/lighting-adapter';
import { buildPvePhysicalDevices } from '../../adapters/physical-device-adapter';
import { evaluateAlerts } from '../../alerts/alert-engine';
import { getDefaultHomeOsAlertRules } from '../../alerts/default-rules';
import { AstronomyVisual } from '../../astronomy/astronomy-visual';
import { getHomeOsCardDefinition, type HomeOsCardKind } from '../../cards/card-registry';
import type { ResolvedSemanticEntity } from '../../core/types';
import { useResolvedHomeOsEntities } from '../../hooks/use-resolved-home-os';
import { getHomeOsCopy } from '../../i18n/home-os-copy';
import { useHomeOsConfigStore } from '../../stores/home-os-config-store';
import { HomeOsDetailDialog } from '../detail/home-os-detail-dialog';

export interface HomeOsWidgetData {
  kind?: HomeOsCardKind;
}

interface HomeOsWidgetProps {
  size: CardSize;
  data?: HomeOsWidgetData;
  isEditMode: boolean;
}

const sizeLimit = (size: CardSize) => (size === 'small' ? 2 : size === 'medium' ? 4 : 8);
const localizedState = (value: unknown, language: string) => {
  if (language !== 'zh' || typeof value !== 'string') return String(value ?? '—');
  const translations: Record<string, string> = {
    detected: '已检测',
    clear: '正常',
    problem: '异常',
    away: '离家',
    home: '在家',
    on: '开启',
    off: '关闭',
    unavailable: '不可用',
    unknown: '未知',
  };
  return translations[value.toLowerCase()] ?? value;
};
const stateText = (entity: ResolvedSemanticEntity, language: string) => {
  const value = entity.entity.primaryState;
  const unit = entity.entity.attributes.unit ?? entity.entity.attributes.unit_of_measurement;
  return `${localizedState(value, language)}${typeof unit === 'string' && unit ? ` ${unit}` : ''}`;
};
const freshnessText = (updatedAt: string | undefined, language: string) => {
  const timestamp = updatedAt ? Date.parse(updatedAt) : Number.NaN;
  if (!Number.isFinite(timestamp))
    return language === 'zh' ? '更新时间未知' : 'Update time unknown';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return language === 'zh' ? '刚刚更新' : 'Updated now';
  if (minutes < 60)
    return language === 'zh'
      ? `${minutes} 分钟前${minutes >= 15 ? ' · 已过期' : ''}`
      : `${minutes}m ago${minutes >= 15 ? ' · stale' : ''}`;
  return language === 'zh'
    ? `${Math.round(minutes / 60)} 小时前 · 已过期`
    : `${Math.round(minutes / 60)}h ago · stale`;
};

function Metrics({
  entities,
  size,
  empty,
  language,
}: {
  entities: ResolvedSemanticEntity[];
  size: CardSize;
  empty: string;
  language: string;
}) {
  if (!entities.length) return <p className="text-sm text-current/55">{empty}</p>;
  return (
    <div className="grid min-h-0 gap-2 overflow-hidden">
      {entities.slice(0, sizeLimit(size)).map((item) => (
        <div key={item.entity.canonicalId} className="flex min-w-0 justify-between gap-3 text-sm">
          <span className="min-w-0">
            <span className="block truncate text-current/65">{item.displayName}</span>
            <span className="block truncate text-[0.65rem] text-current/40">
              {freshnessText(item.entity.lastUpdated, language)}
            </span>
          </span>
          <strong className="shrink-0 tabular-nums">{stateText(item, language)}</strong>
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
  language,
}: {
  size: CardSize;
  entities: ResolvedSemanticEntity[];
  title: string;
  status: string;
  language: string;
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
              <span className="text-current/60">
                {language === 'zh'
                  ? member.state === 'home'
                    ? '在家'
                    : member.state === 'away'
                      ? '离家'
                      : '未知'
                  : member.state}
              </span>
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
  const functionalDevices = useHomeOsConfigStore((state) => state.config.functionalDevices ?? []);
  const lights = buildHomeOsLights(entities, functionalDevices);
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
        getWholeHomeLightActions(controllable).map((action) =>
          dispatchEntityCommand(
            { type: action.command, entityId: action.entityId },
            action.providerId
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
            {on.length} {copy.lightsOn}
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
  const { language } = useI18n();
  const customRules = useHomeOsConfigStore((state) => state.config.alertRules);
  const rules = useMemo(
    () => [...getDefaultHomeOsAlertRules(language), ...customRules],
    [customRules, language]
  );
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

function LunarCard({
  size,
  title,
  language,
  entities,
}: {
  size: CardSize;
  title: string;
  language: string;
  entities: ResolvedSemanticEntity[];
}) {
  return (
    <BaseCard size={size} title={title} headerLeading={<Moon className="h-5 w-5" />}>
      <AstronomyVisual entities={entities} language={language} compact={size === 'small'} />
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
  const physicalDevices = useHomeOsConfigStore((state) => state.config.physicalDevices);
  const setActiveSection = useNavigationStore((state) => state.setActiveSection);
  const [detailOpen, setDetailOpen] = useState(false);
  const definition = getHomeOsCardDefinition(data?.kind);
  if (!definition) {
    return (
      <BaseCard size={size}>
        <p className="text-sm text-current/55">{copy.chooseCard}</p>
      </BaseCard>
    );
  }
  const openDetail = () => {
    if (!definition.detail || isEditMode) return;
    if (definition.detail.presentation === 'page' && definition.detail.routeSection) {
      setActiveSection(definition.detail.routeSection);
      return;
    }
    setDetailOpen(true);
  };
  const withDetail = (content: ReactNode) => {
    const interactive = Boolean(definition.detail) && !isEditMode;
    if (!interactive) {
      return (
        <div
          className="h-full rounded-[24px]"
          data-home-os-summary-only={definition.summaryOnly ? 'true' : undefined}
        >
          {content}
        </div>
      );
    }
    return (
      <>
        {/* biome-ignore lint/a11y/useSemanticElements: card content may include independent controls, so a nested button would be invalid HTML. */}
        <div
          className="h-full cursor-pointer rounded-[24px] outline-none transition-transform active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-orange-400/60"
          role="button"
          tabIndex={0}
          aria-label={`${language === 'zh' ? definition.name.zh : definition.name.en} ${copy.openDetails}`}
          data-home-os-detail={definition.detail?.presentation}
          data-home-os-summary-only={definition.summaryOnly ? 'true' : undefined}
          onClick={(event) => {
            if ((event.target as Element).closest('button,a,input,select,textarea')) return;
            openDetail();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openDetail();
            }
          }}
        >
          {content}
        </div>
        {definition.detail?.presentation === 'dialog' ? (
          <HomeOsDetailDialog
            kind={definition.kind}
            entities={entities}
            isOpen={detailOpen}
            onOpenChange={setDetailOpen}
          />
        ) : null}
      </>
    );
  };
  if (definition.kind === 'household')
    return withDetail(
      <HouseholdCard
        size={size}
        entities={entities}
        title={copy.household}
        status={copy.peopleAtHome}
        language={language}
      />
    );
  if (definition.kind === 'lighting')
    return withDetail(
      <LightingCard size={size} entities={entities} isEditMode={isEditMode} copy={copy} />
    );
  if (definition.kind === 'alerts')
    return withDetail(<AlertsCard size={size} entities={entities} copy={copy} />);
  if (definition.kind === 'modes')
    return <ModesCard size={size} entities={entities} isEditMode={isEditMode} copy={copy} />;
  if (definition.kind === 'lunar')
    return withDetail(
      <LunarCard size={size} title={copy.lunarCalendar} language={language} entities={entities} />
    );
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
  if (definition.kind === 'pve') {
    const device = buildPvePhysicalDevices(matched, physicalDevices)[0];
    const metricEntities = device
      ? matched.filter((item) => device.entityIds.includes(item.entity.externalId))
      : matched;
    return withDetail(
      <BaseCard
        size={size}
        title={name.replace('Home OS · ', '')}
        headerLeading={<Icon className="h-5 w-5" />}
      >
        <div className="flex h-full min-h-0 flex-col justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={
                device?.state === 'online'
                  ? 'h-2 w-2 rounded-full bg-emerald-400'
                  : device?.state === 'offline'
                    ? 'h-2 w-2 rounded-full bg-red-400'
                    : 'h-2 w-2 rounded-full bg-current/30'
              }
            />
            <span>{device ? copy[device.state] : copy.notConfigured}</span>
            {device?.freshness === 'stale' ? (
              <span className="text-amber-400">{copy.dataStale}</span>
            ) : null}
          </div>
          <Metrics
            entities={metricEntities}
            size={size}
            empty={copy.noMappedData}
            language={language}
          />
        </div>
      </BaseCard>
    );
  }
  return withDetail(
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
        <Metrics entities={matched} size={size} empty={copy.noMappedData} language={language} />
      </div>
    </BaseCard>
  );
}
