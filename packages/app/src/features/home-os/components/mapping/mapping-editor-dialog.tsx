import { Button, Input, ModalSurface, Select } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { NavetEntity } from '@navet/core/types';
import { useEffect, useState } from 'react';
import { HOME_OS_ROLES, type SemanticRole } from '../../core/semantic-roles';
import type {
  ControlPolicy,
  DisplayMode,
  HomeOsFunctionalDeviceKind,
  ManualEntityMapping,
} from '../../core/types';
import { getHomeOsCopy } from '../../i18n/home-os-copy';
import { classifyEntity } from '../../mapping/auto-classifier';
import { stableRefForEntity } from '../../mapping/stable-entity-ref';
import { FUNCTIONAL_DEVICE_KIND_NAMES, FUNCTIONAL_DEVICE_KINDS } from './functional-device-options';

const ROLE_OPTIONS = Object.values(HOME_OS_ROLES);

interface MappingEditorDialogProps {
  entity: NavetEntity | null;
  existing?: ManualEntityMapping;
  saving: boolean;
  onClose: () => void;
  onRestoreAuto: () => Promise<void>;
  onSave: (
    mapping: ManualEntityMapping,
    functionalType?: HomeOsFunctionalDeviceKind
  ) => Promise<void>;
}

export function MappingEditorDialog({
  entity,
  existing,
  saving,
  onClose,
  onRestoreAuto,
  onSave,
}: MappingEditorDialogProps) {
  const { language } = useI18n();
  const copy = getHomeOsCopy(language);
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [role, setRole] = useState<SemanticRole>('');
  const [displayName, setDisplayName] = useState('');
  const [roomOverride, setRoomOverride] = useState('');
  const [physicalDeviceId, setPhysicalDeviceId] = useState('');
  const [familyPersonId, setFamilyPersonId] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('primary');
  const [controlPolicy, setControlPolicy] = useState<ControlPolicy>('direct');
  const [functionalType, setFunctionalType] = useState<HomeOsFunctionalDeviceKind | ''>('');

  useEffect(() => {
    setRole(existing?.semanticRoles?.[0] ?? '');
    setDisplayName(existing?.displayName ?? '');
    setRoomOverride(existing?.roomOverride ?? '');
    setPhysicalDeviceId(existing?.physicalDeviceId ?? '');
    setFamilyPersonId(existing?.familyPersonId ?? '');
    setDisplayMode(existing?.displayMode ?? 'primary');
    setControlPolicy(existing?.controlPolicy ?? 'direct');
    setFunctionalType('');
  }, [existing, entity]);

  if (!entity) return null;

  const automatic = classifyEntity(entity)[0];
  const labelClassName = `grid gap-1.5 text-sm font-medium ${surface.textPrimary}`;
  return (
    <ModalSurface
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={`${copy.mapEntity}: ${entity.name}`}
      description={entity.externalId}
      mobileCoverSheet
    >
      <form
        className="grid gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave(
            {
              schemaVersion: 2,
              entityId: entity.externalId,
              stableRef: stableRefForEntity(entity),
              semanticRoles: role ? [role] : [],
              displayName: displayName.trim() || undefined,
              roomOverride: roomOverride.trim() || undefined,
              physicalDeviceId: physicalDeviceId.trim() || undefined,
              familyPersonId: familyPersonId.trim() || undefined,
              displayMode,
              controlPolicy,
              source: 'manual',
              updatedAt: new Date().toISOString(),
            },
            functionalType || undefined
          );
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClassName} htmlFor="home-os-display-name">
            {copy.displayName}
            <Input
              id="home-os-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          <label className={labelClassName} htmlFor="home-os-room">
            {copy.roomOverride}
            <Input
              id="home-os-room"
              value={roomOverride}
              onChange={(event) => setRoomOverride(event.target.value)}
            />
          </label>
          <label className={labelClassName} htmlFor="home-os-functional-type">
            {copy.functionalType}
            <Select
              id="home-os-functional-type"
              value={functionalType}
              onChange={(event) =>
                setFunctionalType(event.target.value as HomeOsFunctionalDeviceKind | '')
              }
            >
              <option value="">{copy.notConfigured}</option>
              {FUNCTIONAL_DEVICE_KINDS.map((value) => (
                <option key={value} value={value}>
                  {FUNCTIONAL_DEVICE_KIND_NAMES[value][language === 'zh' ? 'zh' : 'en']}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <details className={`rounded-xl border p-3 ${surface.border}`}>
          <summary className={`cursor-pointer text-sm font-medium ${surface.textPrimary}`}>
            {copy.advanced}
          </summary>
          <div className="mt-4 grid gap-4">
            <div className={`rounded-xl border p-3 text-sm ${surface.border} ${surface.subtleBg}`}>
              <p className={`font-medium ${surface.textPrimary}`}>
                {copy.autoRole}: {automatic?.role ?? copy.unmapped}
              </p>
              <p className={`mt-1 ${surface.textSecondary}`}>
                {copy.confidence}: {Math.round((automatic?.confidence ?? 0) * 100)}%
              </p>
              <p className={`mt-1 ${surface.textMuted}`}>
                {copy.reason}: {automatic?.reasons.join(' · ') || copy.noClassificationReason}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {automatic ? (
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    onClick={() => setRole(automatic.role)}
                  >
                    {copy.useSuggestion}
                  </Button>
                ) : null}
                <Button type="button" size="small" variant="ghost" onClick={() => setRole('')}>
                  {copy.clearMapping}
                </Button>
              </div>
            </div>
            <label className={labelClassName} htmlFor="home-os-role">
              {copy.semanticRole}
              <Select
                id="home-os-role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="">{copy.unmapped}</option>
                {role && !ROLE_OPTIONS.includes(role as (typeof ROLE_OPTIONS)[number]) ? (
                  <option value={role}>{role}</option>
                ) : null}
                {ROLE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClassName} htmlFor="home-os-physical-device">
                {copy.physicalDeviceId}
                <Input
                  id="home-os-physical-device"
                  value={physicalDeviceId}
                  onChange={(event) => setPhysicalDeviceId(event.target.value)}
                />
              </label>
              <label className={labelClassName} htmlFor="home-os-family-person">
                {copy.familyPersonId}
                <Input
                  id="home-os-family-person"
                  value={familyPersonId}
                  onChange={(event) => setFamilyPersonId(event.target.value)}
                />
              </label>
              <label className={labelClassName} htmlFor="home-os-display-mode">
                {copy.displayMode}
                <Select
                  id="home-os-display-mode"
                  value={displayMode}
                  onChange={(event) => setDisplayMode(event.target.value as DisplayMode)}
                >
                  <option value="primary">{copy.primary}</option>
                  <option value="detail">{copy.detail}</option>
                  <option value="diagnostic">{copy.diagnostic}</option>
                  <option value="hidden">{copy.hidden}</option>
                </Select>
              </label>
              <label className={labelClassName} htmlFor="home-os-control-policy">
                {copy.controlPolicy}
                <Select
                  id="home-os-control-policy"
                  value={controlPolicy}
                  onChange={(event) => setControlPolicy(event.target.value as ControlPolicy)}
                >
                  <option value="direct">{copy.direct}</option>
                  <option value="confirm">{copy.confirm}</option>
                  <option value="dangerous">{copy.dangerous}</option>
                  <option value="readonly">{copy.readOnly}</option>
                </Select>
              </label>
            </div>
          </div>
        </details>
        <div className="flex justify-end gap-2 pt-2">
          {existing ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => void onRestoreAuto().then(onClose)}
              disabled={saving}
            >
              {copy.restoreAuto}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {copy.cancel}
          </Button>
          <Button type="submit" loading={saving}>
            {copy.saveMapping}
          </Button>
        </div>
      </form>
    </ModalSurface>
  );
}
