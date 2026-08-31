import { Button, Input, ModalSurface, Select } from '@navet/app/components/primitives';
import type { NavetEntity } from '@navet/core/types';
import { useEffect, useState } from 'react';
import { HOME_OS_ROLES, type SemanticRole } from '../../core/semantic-roles';
import type { ControlPolicy, DisplayMode, ManualEntityMapping } from '../../core/types';

const ROLE_OPTIONS = Object.values(HOME_OS_ROLES);

interface MappingEditorDialogProps {
  entity: NavetEntity | null;
  existing?: ManualEntityMapping;
  saving: boolean;
  onClose: () => void;
  onSave: (mapping: ManualEntityMapping) => Promise<void>;
}

export function MappingEditorDialog({
  entity,
  existing,
  saving,
  onClose,
  onSave,
}: MappingEditorDialogProps) {
  const [role, setRole] = useState<SemanticRole>('');
  const [displayName, setDisplayName] = useState('');
  const [roomOverride, setRoomOverride] = useState('');
  const [physicalDeviceId, setPhysicalDeviceId] = useState('');
  const [familyPersonId, setFamilyPersonId] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('primary');
  const [controlPolicy, setControlPolicy] = useState<ControlPolicy>('direct');

  useEffect(() => {
    setRole(existing?.semanticRoles?.[0] ?? '');
    setDisplayName(existing?.displayName ?? '');
    setRoomOverride(existing?.roomOverride ?? '');
    setPhysicalDeviceId(existing?.physicalDeviceId ?? '');
    setFamilyPersonId(existing?.familyPersonId ?? '');
    setDisplayMode(existing?.displayMode ?? 'primary');
    setControlPolicy(existing?.controlPolicy ?? 'direct');
  }, [existing, entity]);

  if (!entity) return null;

  const labelClassName = 'grid gap-1.5 text-sm font-medium';
  return (
    <ModalSurface
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={`Map ${entity.name}`}
      description={entity.externalId}
      mobileCoverSheet
    >
      <form
        className="grid gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave({
            schemaVersion: 2,
            entityId: entity.externalId,
            stableRef: {
              canonicalId: entity.canonicalId,
              providerId: entity.providerId,
              uniqueId:
                typeof entity.attributes.uniqueId === 'string'
                  ? entity.attributes.uniqueId
                  : undefined,
            },
            semanticRoles: role ? [role] : [],
            displayName: displayName.trim() || undefined,
            roomOverride: roomOverride.trim() || undefined,
            physicalDeviceId: physicalDeviceId.trim() || undefined,
            familyPersonId: familyPersonId.trim() || undefined,
            displayMode,
            controlPolicy,
            source: 'manual',
            updatedAt: new Date().toISOString(),
          });
        }}
      >
        <label className={labelClassName} htmlFor="home-os-role">
          Semantic role
          <Select id="home-os-role" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">Unmapped</option>
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
          <label className={labelClassName} htmlFor="home-os-display-name">
            Display name
            <Input
              id="home-os-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          <label className={labelClassName} htmlFor="home-os-room">
            Room override
            <Input
              id="home-os-room"
              value={roomOverride}
              onChange={(event) => setRoomOverride(event.target.value)}
            />
          </label>
          <label className={labelClassName} htmlFor="home-os-physical-device">
            Physical device ID
            <Input
              id="home-os-physical-device"
              value={physicalDeviceId}
              onChange={(event) => setPhysicalDeviceId(event.target.value)}
            />
          </label>
          <label className={labelClassName} htmlFor="home-os-family-person">
            Family person ID
            <Input
              id="home-os-family-person"
              value={familyPersonId}
              onChange={(event) => setFamilyPersonId(event.target.value)}
            />
          </label>
          <label className={labelClassName} htmlFor="home-os-display-mode">
            Display mode
            <Select
              id="home-os-display-mode"
              value={displayMode}
              onChange={(event) => setDisplayMode(event.target.value as DisplayMode)}
            >
              <option value="primary">Primary</option>
              <option value="detail">Detail</option>
              <option value="diagnostic">Diagnostic</option>
              <option value="hidden">Hidden</option>
            </Select>
          </label>
          <label className={labelClassName} htmlFor="home-os-control-policy">
            Control policy
            <Select
              id="home-os-control-policy"
              value={controlPolicy}
              onChange={(event) => setControlPolicy(event.target.value as ControlPolicy)}
            >
              <option value="direct">Direct</option>
              <option value="confirm">Confirm</option>
              <option value="dangerous">Dangerous</option>
              <option value="readonly">Read only</option>
            </Select>
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save mapping
          </Button>
        </div>
      </form>
    </ModalSurface>
  );
}
