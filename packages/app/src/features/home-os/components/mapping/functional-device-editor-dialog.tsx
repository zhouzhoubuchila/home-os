import { Button, Input, ModalSurface, Select } from '@navet/app/components/primitives';
import { useI18n } from '@navet/app/hooks';
import { useEffect, useMemo, useState } from 'react';
import type {
  HomeOsFunctionalDevice,
  HomeOsFunctionalDeviceKind,
  ResolvedSemanticEntity,
} from '../../core/types';
import { getHomeOsCopy } from '../../i18n/home-os-copy';
import { FUNCTIONAL_DEVICE_KIND_NAMES, FUNCTIONAL_DEVICE_KINDS } from './functional-device-options';

const METRICS: Partial<Record<HomeOsFunctionalDeviceKind, string[]>> = {
  light: ['power', 'voltage'],
  pve: ['online', 'cpu', 'temperature', 'memory', 'storage', 'uptime'],
  router: [
    'online',
    'cpu',
    'memory',
    'temperature',
    'wan_ip',
    'lan_ip',
    'clients',
    'uptime',
    'upload',
    'download',
  ],
  internet: ['online', 'latency', 'packet_loss', 'jitter', 'download', 'upload'],
  server: ['online', 'version', 'cpu', 'memory', 'uptime'],
  energy_meter: ['today', 'month', 'balance', 'power'],
  gas_account: ['today', 'month', 'balance', 'account_status'],
  air_quality: ['aqi', 'pm25', 'pm10', 'co2', 'voc', 'temperature', 'humidity'],
  person: ['phone_tracker', 'additional_tracker'],
};

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
  const options = useMemo(
    () => [...entities].sort((left, right) => left.displayName.localeCompare(right.displayName)),
    [entities]
  );

  useEffect(() => {
    if (!open) return;
    const selected = entities.filter((item) => initialEntityIds.includes(item.entity.externalId));
    const primary = selected[0];
    const control = selected.find((item) =>
      /^(light|switch|button)\./.test(item.entity.externalId)
    );
    setName(existing?.name ?? primary?.displayName ?? '');
    setRoom(existing?.room ?? primary?.room ?? '');
    setKind(existing?.kind ?? 'light');
    setStateEntityId(
      existing?.stateEntityId ?? control?.entity.externalId ?? primary?.entity.externalId ?? ''
    );
    setTurnOnEntityId(existing?.controls?.on ?? '');
    setTurnOffEntityId(existing?.controls?.off ?? '');
    setToggleEntityId(existing?.controls?.toggle ?? '');
    setTriggerEntityId(existing?.controls?.trigger ?? '');
    setMetrics(existing?.metrics ?? {});
  }, [entities, existing, initialEntityIds, open]);

  if (!open) return null;
  const metricKeys = METRICS[kind] ?? [];
  const entityOption = (item: ResolvedSemanticEntity) => (
    <option key={item.entity.canonicalId} value={item.entity.externalId}>
      {item.displayName} ({item.entity.externalId})
    </option>
  );

  return (
    <ModalSurface
      isOpen
      onOpenChange={(next) => !next && onClose()}
      title={copy.functionalDevice}
      description={copy.functionalDeviceDescription}
      mobileCoverSheet
    >
      <form
        className="grid gap-4 p-5"
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
            room: room.trim() || undefined,
            stateEntityId: stateEntityId || undefined,
            controls: Object.values(controls).some(Boolean) ? controls : undefined,
            metrics: populatedMetrics,
            sourceEntityIds,
            manual: true,
          });
        }}
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
        <label className="grid gap-1 text-sm" htmlFor="functional-device-state">
          {copy.stateEntity}
          <Select
            id="functional-device-state"
            value={stateEntityId}
            onChange={(event) => setStateEntityId(event.target.value)}
          >
            <option value="">—</option>
            {options.map(entityOption)}
          </Select>
        </label>
        <fieldset className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
          <legend className="px-1 text-sm font-medium">{copy.controlCapability}</legend>
          {[
            [copy.turnOnEntity, turnOnEntityId, setTurnOnEntityId, 'turn-on'],
            [copy.turnOffEntity, turnOffEntityId, setTurnOffEntityId, 'turn-off'],
            [copy.toggleOnly, toggleEntityId, setToggleEntityId, 'toggle'],
            [copy.trigger, triggerEntityId, setTriggerEntityId, 'trigger'],
          ].map(([label, value, setValue, id]) => (
            <label
              key={String(id)}
              className="grid gap-1 text-sm"
              htmlFor={`functional-device-${id}`}
            >
              {String(label)}
              <Select
                id={`functional-device-${id}`}
                value={String(value)}
                onChange={(event) => (setValue as (next: string) => void)(event.target.value)}
              >
                <option value="">{copy.readOnly}</option>
                {options.map(entityOption)}
              </Select>
            </label>
          ))}
        </fieldset>
        {metricKeys.map((metric) => (
          <label
            key={metric}
            className="grid gap-1 text-sm"
            htmlFor={`functional-device-metric-${metric}`}
          >
            {metric.replaceAll('_', ' ')}
            <Select
              id={`functional-device-metric-${metric}`}
              value={metrics[metric] ?? ''}
              onChange={(event) =>
                setMetrics((current) => ({ ...current, [metric]: event.target.value }))
              }
            >
              <option value="">—</option>
              {options.map(entityOption)}
            </Select>
          </label>
        ))}
        <div className="flex justify-end gap-2">
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
