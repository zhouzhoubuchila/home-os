import { Button, Input, Select } from '@navet/app/components/primitives';
import { cn } from '@navet/app/components/ui/utils';
import { SettingsSectionShell } from '@navet/app/features/settings/components/settings-section-shell';
import type { SettingsSectionController } from '@navet/app/features/settings/hooks/use-settings-section-controller';
import { useIntegrationStore } from '@navet/app/hooks';
import { integrationSelectors } from '@navet/app/stores/selectors';
import type { NavetEntity } from '@navet/core/types';
import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { exportHomeOsConfig, importHomeOsConfig } from '../../config/export-import';
import type { ManualEntityMapping, ResolvedSemanticEntity } from '../../core/types';
import { resolveSemanticEntities } from '../../mapping/semantic-resolver';
import { useHomeOsConfigStore } from '../../stores/home-os-config-store';
import { EntityMappingRow } from './entity-mapping-row';
import { MappingEditorDialog } from './mapping-editor-dialog';

type Filter =
  | 'all'
  | 'review'
  | 'manual'
  | 'ignored'
  | 'lighting'
  | 'family'
  | 'homelab'
  | 'energy';

const matchesFilter = (resolved: ResolvedSemanticEntity, filter: Filter) => {
  if (filter === 'all') return true;
  if (filter === 'review') return resolved.needsReview;
  if (filter === 'manual') return resolved.source === 'manual';
  if (filter === 'ignored') return resolved.ignored;
  return resolved.roles.some((role) => role.startsWith(`${filter}.`));
};

export function MappingSettingsPage({ controller }: { controller: SettingsSectionController }) {
  const entitiesById = useIntegrationStore(
    useShallow(integrationSelectors.providerEntitiesByCanonicalId)
  );
  const { config, loading, saving, error, recovered, load, reset, upsertMapping, removeMapping } =
    useHomeOsConfigStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<NavetEntity | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const resolved = useMemo(
    () => resolveSemanticEntities(Object.values(entitiesById), config.mappings),
    [config.mappings, entitiesById]
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return resolved.filter(
      (item) =>
        matchesFilter(item, filter) &&
        (!needle ||
          item.displayName.toLowerCase().includes(needle) ||
          item.entity.externalId.toLowerCase().includes(needle) ||
          item.roles.some((role) => role.toLowerCase().includes(needle)))
    );
  }, [filter, query, resolved]);
  const existing = editing
    ? config.mappings.find((mapping) => mapping.entityId === editing.externalId)
    : undefined;

  const ignore = async (item: ResolvedSemanticEntity) => {
    const current = item.mapping;
    await upsertMapping({
      schemaVersion: 2,
      entityId: item.entity.externalId,
      stableRef: current?.stableRef ?? {
        canonicalId: item.entity.canonicalId,
        providerId: item.entity.providerId,
      },
      ...current,
      semanticRoles: current?.semanticRoles ?? item.roles,
      ignored: true,
      source: 'manual',
      updatedAt: new Date().toISOString(),
    });
  };

  const exportConfig = () => {
    const blob = new Blob([exportHomeOsConfig(config)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `home-os-config-v${config.schemaVersion}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = async (file: File) => {
    try {
      setTransferError(null);
      const imported = importHomeOsConfig(await file.text());
      await useHomeOsConfigStore.getState().save({ ...imported, revision: config.revision });
    } catch (cause) {
      setTransferError(cause instanceof Error ? cause.message : 'Configuration import failed');
    }
  };

  return (
    <SettingsSectionShell
      id="home-os-mapping"
      icon={SlidersHorizontal}
      title="Home OS entity mapping"
      description="Review automatic roles, bind physical devices, and make durable manual overrides."
      styles={controller.styles}
    >
      <div className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_180px_auto] md:px-5">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, entity ID, or role"
          aria-label="Search Home OS mappings"
        />
        <Select value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
          <option value="all">All entities</option>
          <option value="review">Needs review</option>
          <option value="manual">Manual</option>
          <option value="ignored">Ignored</option>
          <option value="lighting">Lighting</option>
          <option value="family">Family</option>
          <option value="homelab">Homelab</option>
          <option value="energy">Energy</option>
        </Select>
        <Button variant="secondary" onClick={() => void load()} loading={loading}>
          Refresh
        </Button>
        <div className="flex flex-wrap gap-2 md:col-span-3">
          <Button size="small" variant="ghost" onClick={exportConfig}>
            Export config
          </Button>
          <Button size="small" variant="ghost" onClick={() => importInputRef.current?.click()}>
            Import config
          </Button>
          <Button
            size="small"
            variant={confirmReset ? 'destructive' : 'ghost'}
            loading={saving}
            onClick={() => {
              if (!confirmReset) {
                setConfirmReset(true);
                return;
              }
              void reset().finally(() => setConfirmReset(false));
            }}
          >
            {confirmReset ? 'Confirm reset' : 'Reset Home OS'}
          </Button>
          <input
            ref={importInputRef}
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importConfig(file);
              event.target.value = '';
            }}
          />
        </div>
      </div>
      {error ? <p className="px-5 py-3 text-sm text-red-500">{error}</p> : null}
      {transferError ? <p className="px-5 py-3 text-sm text-red-500">{transferError}</p> : null}
      {recovered ? (
        <p className="px-5 py-3 text-sm text-amber-500">
          The primary configuration was invalid; Home OS recovered its backup.
        </p>
      ) : null}
      <div className="flex items-center justify-between px-5 py-3 text-xs">
        <span className={controller.styles.subtleColor}>
          {visible.length} of {resolved.length} entities · revision {config.revision}
        </span>
        <span className={cn(controller.styles.subtleColor, 'hidden sm:inline')}>
          Manual changes override auto-classification.
        </span>
      </div>
      {visible.length ? (
        visible.map((item) => (
          <EntityMappingRow
            key={item.entity.canonicalId}
            resolved={item}
            styles={controller.styles}
            saving={saving}
            onEdit={() => setEditing(item.entity)}
            onIgnore={() => void ignore(item)}
            onRestoreAuto={() => void removeMapping(item.entity.externalId)}
          />
        ))
      ) : (
        <p className={cn('px-5 py-10 text-center text-sm', controller.styles.subtleColor)}>
          No matching entities.
        </p>
      )}
      <MappingEditorDialog
        entity={editing}
        existing={existing}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={async (mapping: ManualEntityMapping) => {
          await upsertMapping(mapping);
          setEditing(null);
        }}
      />
    </SettingsSectionShell>
  );
}
