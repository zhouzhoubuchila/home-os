import { Button, Input, ModalSurface, Select } from '@navet/app/components/primitives';
import { useI18n } from '@navet/app/hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  HomeOsFunctionalDevice,
  HomeOsFunctionalDeviceKind,
  ResolvedSemanticEntity,
} from '../../core/types';
import { getHomeOsCopy } from '../../i18n/home-os-copy';
import {
  CONTROLLABLE_DEVICE_KINDS,
  createFunctionalDeviceEditorDraft,
  FUNCTIONAL_DEVICE_METRIC_LABELS,
  FUNCTIONAL_DEVICE_METRICS,
  normalizeFunctionalDeviceRoom,
} from './functional-device-editor-model';
import { FUNCTIONAL_DEVICE_KIND_NAMES, FUNCTIONAL_DEVICE_KINDS } from './functional-device-options';
import { SearchableEntitySelect } from './searchable-entity-select';

interface FunctionalDeviceEditorDialogProps {
  open: boolean;
  existing?: HomeOsFunctionalDevice;
  entities: readonly ResolvedSemanticEntity[];
  initialEntityIds: readonly string[];
  saving: boolean;
  onClose: () => void;
  onSave: (device: HomeOsFunctionalDevice) => Promise<void>;
}

export function FunctionalDeviceEditorDialog({
  open,
  existing,
  entities,
  initialEntityIds,
  saving,
  onClose,
  onSave,
}: FunctionalDeviceEditorDialogProps) {
  const { language } = useI18n();
  const copy = getHomeOsCopy(language);
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [kind, setKind] = useState<HomeOsFunctionalDeviceKind>('light');
  const [stateEntityId, setStateEntityId] = useState('');
  const [turnOnEntityId, setTurnOnEntityId] = useState('');
  const [turnOffEntityId, setTurnOffEntityId] = useState('');
  const [toggleEntityId, setToggleEntityId] = useState('');
  const [triggerEntityId, setTriggerEntityId] = useState('');
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const initializationInputRef = useRef({ existing, entities, initialEntityIds });
  initializationInputRef.current = { existing, entities, initialEntityIds };
  const editorIdentity = existing?.id ?? 'create';
  const entitySelectCopy = useMemo(
    () =>
      language === 'zh'
        ? {
            searchPlaceholder: '搜索名称、实体 ID、房间、设备、集成或角色',
            selectedGroupLabel: '已选择实体',
            otherGroupLabel: '其他实体',
            clearLabel: '清空选择',
            noResultsLabel: '没有匹配的实体',
          }
        : {
            searchPlaceholder: 'Search name, entity ID, room, device, integration, or role',
            selectedGroupLabel: 'Selected entities',
            otherGroupLabel: 'Other entities',
            clearLabel: 'Clear selection',
            noResultsLabel: 'No matching entities',
          },
    [language]
  );

  useEffect(() => {
    if (!open) return;
    const input = initializationInputRef.current;
    const draft = createFunctionalDeviceEditorDraft(
      input.existing,
      input.entities,
      input.initialEntityIds
    );
    setName(draft.name);
    setRoom(draft.room);
    setKind(draft.kind);
    setStateEntityId(draft.stateEntityId);
    setTurnOnEntityId(draft.turnOnEntityId);
    setTurnOffEntityId(draft.turnOffEntityId);
    setToggleEntityId(draft.toggleEntityId);
    setTriggerEntityId(draft.triggerEntityId);
    setMetrics(draft.metrics);
  }, [editorIdentity, open]);

  if (!open) return null;
  const metricKeys = FUNCTIONAL_DEVICE_METRICS[kind] ?? [];
  const showControls = CONTROLLABLE_DEVICE_KINDS.has(kind);
  const updateMetric = (metric: string, next: string) => {
    const previous = metrics[metric];
    setMetrics((current) => ({ ...current, [metric]: next }));
    if (metric === 'online' && (!stateEntityId || stateEntityId === previous)) {
      setStateEntityId(next);
    }
  };
  const entitySelect = (
    id: string,
    label: string,
    value: string,
    onChange: (next: string) => void,
    emptyLabel = '—'
  ) => (
    <SearchableEntitySelect
      id={id}
      ariaLabel={label}
      entities={entities}
      initialEntityIds={initialEntityIds}
      value={value}
      onChange={onChange}
      emptyLabel={emptyLabel}
      {...entitySelectCopy}
    />
  );

  return (
    <ModalSurface
      isOpen
      onOpenChange={(next) => !next && onClose()}
      title={copy.functionalDevice}
      description={copy.functionalDeviceDescription}
      mobileCoverSheet
      contentClassName="flex max-h-[90dvh] flex-col overflow-hidden max-sm:!max-h-[calc(100dvh-0.5rem)]"
      shellBodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          const controls = {
            on: turnOnEntityId || undefined,
            off: turnOffEntityId || undefined,
            toggle: toggleEntityId || undefined,
            trigger: triggerEntityId || undefined,
          };
          const populatedMetrics = Object.fromEntries(
            Object.entries(metrics).filter(([, value]) => value)
          );
          const sourceEntityIds = [
            ...new Set([
              ...initialEntityIds,
              stateEntityId,
              turnOnEntityId,
              turnOffEntityId,
              toggleEntityId,
              triggerEntityId,
              ...Object.values(populatedMetrics),
            ]),
          ].filter(Boolean);
          void onSave({
            id: existing?.id ?? `functional-${kind}-${Date.now().toString(36)}`,
            kind,
            name: name.trim(),
            room: normalizeFunctionalDeviceRoom(room) || undefined,
            stateEntityId: stateEntityId || undefined,
            controls: Object.values(controls).some(Boolean) ? controls : undefined,
            metrics: populatedMetrics,
            sourceEntityIds,
            manual: true,
          });
        }}
      >
        <header className="shrink-0 border-b px-5 py-4 max-sm:pr-16">
          <h2 className="text-base font-semibold">{copy.functionalDevice}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.functionalDeviceDescription}</p>
        </header>
        <div
          data-functional-device-scroll-region
          className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain p-5"
        >
          <label className="grid gap-1 text-sm" htmlFor="functional-device-name">
            {copy.functionalDeviceName}
            <Input
              id="functional-device-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="functional-device-kind">
            {copy.functionalType}
            <Select
              id="functional-device-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as HomeOsFunctionalDeviceKind)}
            >
              {FUNCTIONAL_DEVICE_KINDS.map((value) => (
                <option key={value} value={value}>
                  {FUNCTIONAL_DEVICE_KIND_NAMES[value][language === 'zh' ? 'zh' : 'en']}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1 text-sm" htmlFor="functional-device-room">
            {copy.room}
            <Input
              id="functional-device-room"
              value={room}
              onChange={(event) => setRoom(event.target.value)}
            />
          </label>
          <div className="grid gap-1 text-sm">
            <span>{copy.stateEntity}</span>
            {entitySelect(
              'functional-device-state',
              copy.stateEntity,
              stateEntityId,
              setStateEntityId
            )}
          </div>
          {showControls ? (
            <fieldset className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
              <legend className="px-1 text-sm font-medium">{copy.controlCapability}</legend>
              {[
                [copy.turnOnEntity, turnOnEntityId, setTurnOnEntityId, 'turn-on'],
                [copy.turnOffEntity, turnOffEntityId, setTurnOffEntityId, 'turn-off'],
                [copy.toggleOnly, toggleEntityId, setToggleEntityId, 'toggle'],
                [copy.trigger, triggerEntityId, setTriggerEntityId, 'trigger'],
              ].map(([label, value, setValue, id]) => (
                <div key={String(id)} className="grid gap-1 text-sm">
                  <span>{String(label)}</span>
                  {entitySelect(
                    `functional-device-${id}`,
                    String(label),
                    String(value),
                    setValue as (next: string) => void,
                    copy.readOnly
                  )}
                </div>
              ))}
            </fieldset>
          ) : null}
          {metricKeys.map((metric) => {
            const metricLabel =
              kind === 'pve' && metric === 'temperature'
                ? language === 'zh'
                  ? 'CPU 温度'
                  : 'CPU temperature'
                : (FUNCTIONAL_DEVICE_METRIC_LABELS[metric]?.[language === 'zh' ? 'zh' : 'en'] ??
                  metric.replaceAll('_', ' '));
            return (
              <div key={metric} className="grid gap-1 text-sm">
                <span>{metricLabel}</span>
                {entitySelect(
                  `functional-device-metric-${metric}`,
                  metricLabel,
                  metrics[metric] ?? '',
                  (next) => updateMetric(metric, next)
                )}
              </div>
            );
          })}
        </div>
        <div
          data-functional-device-footer
          className="flex shrink-0 justify-end gap-2 border-t bg-background/95 px-5 py-3 backdrop-blur"
        >
          <Button type="button" variant="ghost" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button type="submit" loading={saving} disabled={!name.trim()}>
            {copy.saveFunctionalDevice}
          </Button>
        </div>
      </form>
    </ModalSurface>
  );
}
