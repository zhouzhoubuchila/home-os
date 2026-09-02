import { Button, Input, Select } from '@navet/app/components/primitives';
import { cn } from '@navet/app/components/ui/utils';
import { SettingsSectionShell } from '@navet/app/features/settings/components/settings-section-shell';
import type { SettingsSectionController } from '@navet/app/features/settings/hooks/use-settings-section-controller';
import { useI18n, useIntegrationStore, useProviderWeatherDevices } from '@navet/app/hooks';
import { integrationSelectors } from '@navet/app/stores/selectors';
import type { NavetEntity } from '@navet/core/types';
import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { buildHomeOsLights } from '../../adapters/lighting-adapter';
import { exportHomeOsConfig, importHomeOsConfig } from '../../config/export-import';
import type { ManualEntityMapping, ResolvedSemanticEntity } from '../../core/types';
import { getHomeOsCopy } from '../../i18n/home-os-copy';
import { resolveAirQualitySources, resolveWeatherSource } from '../../mapping/data-source-resolver';
import { upsertManualMapping } from '../../mapping/manual-overrides';
import { buildHomeOsMappingSearchIndex } from '../../mapping/search-index';
import { resolveSemanticEntities } from '../../mapping/semantic-resolver';
import { useHomeOsConfigStore } from '../../stores/home-os-config-store';
import { EntityMappingRow } from './entity-mapping-row';
import { MappingEditorDialog } from './mapping-editor-dialog';

type Filter =
  | 'all'
  | 'review'
  | 'mapped'
  | 'unmapped'
  | 'diagnostic'
  | 'manual'
  | 'ignored'
  | 'lighting'
  | 'family'
  | 'homelab'
  | 'energy';

const matchesFilter = (resolved: ResolvedSemanticEntity, filter: Filter) => {
  if (filter === 'all') return resolved.reviewDisposition !== 'diagnostic' && !resolved.ignored;
  if (filter === 'review') return resolved.needsReview;
  if (filter === 'mapped') return resolved.reviewDisposition === 'mapped';
  if (filter === 'unmapped') return resolved.reviewDisposition === 'unmapped';
  if (filter === 'diagnostic') return resolved.reviewDisposition === 'diagnostic';
  if (filter === 'manual') return resolved.source === 'manual';
  if (filter === 'ignored') return resolved.ignored;
  return resolved.roles.some((role) => role.startsWith(`${filter}.`));
};

export function MappingSettingsPage({ controller }: { controller: SettingsSectionController }) {
  const { language } = useI18n();
  const copy = getHomeOsCopy(language);
  const providerWeather = useProviderWeatherDevices();
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [batchPhysicalDeviceId, setBatchPhysicalDeviceId] = useState('');
  const [circuitName, setCircuitName] = useState('');
  const [circuitRoom, setCircuitRoom] = useState('');
  const [batchDisplayMode, setBatchDisplayMode] =
    useState<ManualEntityMapping['displayMode']>('detail');
  const [visibleLimit, setVisibleLimit] = useState(160);

  useEffect(() => {
    void load();
  }, [load]);

  const resolved = useMemo(
    () => resolveSemanticEntities(Object.values(entitiesById), config.mappings),
    [config.mappings, entitiesById]
  );
  const searchIndex = useMemo(() => buildHomeOsMappingSearchIndex(resolved), [resolved]);
  const visible = useMemo(() => {
    return searchIndex.search(query).filter((item) => matchesFilter(item, filter));
  }, [filter, query, searchIndex]);
  const existing = editing
    ? config.mappings.find((mapping) => mapping.entityId === editing.externalId)
    : undefined;

  useEffect(() => {
    setVisibleLimit(160);
  }, [filter, query]);

  const diagnostics = useMemo(() => {
    const weather = resolveWeatherSource(providerWeather, resolved);
    const air = resolveAirQualitySources(resolved);
    const sun = resolved.find((item) => item.entity.externalId === 'sun.sun');
    const moon = resolved.find((item) =>
      /moon|月相/.test(`${item.entity.externalId} ${item.displayName}`.toLowerCase())
    );
    const routerNegatives = resolved.filter((item) => {
      const text =
        `${item.entity.externalId} ${item.displayName} ${String(item.entity.attributes.integration ?? '')}`.toLowerCase();
      return (
        /xiaomi gateway|mi gateway|gateway hub|zigbee|matter|homekit|bridge/.test(text) &&
        !item.roles.some((role) => role.startsWith('network.router.'))
      );
    });
    return {
      mapped: resolved.filter((item) => item.reviewDisposition === 'mapped').length,
      review: resolved.filter((item) => item.needsReview).length,
      manual: resolved.filter((item) => item.source === 'manual').length,
      ignored: resolved.filter((item) => item.ignored).length,
      diagnostic: resolved.filter((item) => item.reviewDisposition === 'diagnostic').length,
      pve: resolved.filter((item) => item.roles.some((role) => role.startsWith('homelab.pve.')))
        .length,
      router: resolved.filter((item) =>
        item.roles.some((role) => role.startsWith('network.router.'))
      ).length,
      internet: resolved.filter((item) =>
        item.roles.some((role) => role.startsWith('network.internet.'))
      ).length,
      lightingCircuits: buildHomeOsLights(resolved, config.functionalDevices ?? []).length,
      weatherSource: weather ? `${weather.sourceType}: ${weather.id}` : '—',
      airMetrics: air.metrics.flatMap((item) => item.roles).length,
      sunEntity: sun?.entity.externalId ?? '—',
      moonSource: moon?.entity.externalId ?? 'calculated',
      routerNegatives: routerNegatives.length,
      environmentTemperature: resolved.filter((item) =>
        item.roles.includes('environment.temperature')
      ).length,
      refrigerationTemperature: resolved.filter((item) =>
        item.roles.includes('appliance.refrigeration_temperature')
      ).length,
      pveTemperature: resolved.filter((item) => item.roles.includes('homelab.pve.temperature'))
        .length,
      internalTemperature: resolved.filter((item) =>
        item.roles.includes('device.internal_temperature')
      ).length,
    };
  }, [config.functionalDevices, providerWeather, resolved]);

  const batchUpdate = async (ignored: boolean) => {
    const selected = resolved.filter((item) => selectedIds.has(item.entity.externalId));
    const updatedAt = new Date().toISOString();
    const mappings = selected.reduce((currentMappings, item) => {
      const current = item.mapping;
      const next: ManualEntityMapping = {
        schemaVersion: 2,
        entityId: item.entity.externalId,
        stableRef: current?.stableRef ?? {
          canonicalId: item.entity.canonicalId,
          providerId: item.entity.providerId,
        },
        ...current,
        semanticRoles: current?.semanticRoles ?? item.roles,
        physicalDeviceId: batchPhysicalDeviceId.trim() || current?.physicalDeviceId,
        displayMode: batchDisplayMode,
        ignored,
        source: 'manual',
        updatedAt,
      };
      return upsertManualMapping(currentMappings, next);
    }, config.mappings);
    await useHomeOsConfigStore.getState().save({ ...config, mappings });
    setSelectedIds(new Set());
  };

  const createLightingCircuit = async () => {
    const selected = resolved.filter((item) => selectedIds.has(item.entity.externalId));
    const byDomain = (domain: string) =>
      selected.find((item) => item.entity.externalId.startsWith(`${domain}.`))?.entity.externalId;
    const namedButton = (pattern: RegExp) =>
      selected.find(
        (item) =>
          item.entity.externalId.startsWith('button.') &&
          pattern.test(`${item.entity.externalId} ${item.displayName}`.toLowerCase())
      )?.entity.externalId;
    const stateEntityId = byDomain('binary_sensor') ?? byDomain('light') ?? byDomain('switch');
    const toggle = byDomain('light') ?? byDomain('switch') ?? namedButton(/toggle|\u5207\u6362/);
    const on = namedButton(/(?:^|[._ ])on(?:$|[._ ])|\u5f00\u542f|\u6253\u5f00/);
    const off = namedButton(/(?:^|[._ ])off(?:$|[._ ])|\u5173\u95ed/);
    const brightness = byDomain('number');
    const name = circuitName.trim() || selected[0]?.displayName || copy.newLightingCircuit;
    const id = `light-circuit-${Date.now().toString(36)}`;
    await useHomeOsConfigStore.getState().save({
      ...config,
      functionalDevices: [
        ...(config.functionalDevices ?? []),
        {
          id,
          kind: 'light',
          name,
          room: circuitRoom.trim() || selected.find((item) => item.room)?.room,
          stateEntityId,
          controls: { on, off, toggle, brightness },
          metrics: {},
          sourceEntityIds: selected.map((item) => item.entity.externalId),
          manual: true,
        },
      ],
    });
    setSelectedIds(new Set());
    setCircuitName('');
    setCircuitRoom('');
  };

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
      setTransferError(cause instanceof Error ? cause.message : copy.configurationImportFailed);
    }
  };

  return (
    <SettingsSectionShell
      id="home-os-mapping"
      icon={SlidersHorizontal}
      title={copy.mappingTitle}
      description={copy.mappingDescription}
      styles={controller.styles}
    >
      <div className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_180px_auto] md:px-5">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.searchMappings}
          aria-label={copy.searchMappings}
        />
        <Select value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
          <option value="all">{copy.allEntities}</option>
          <option value="review">{copy.needsReview}</option>
          <option value="mapped">{copy.mapped}</option>
          <option value="unmapped">{copy.unmapped}</option>
          <option value="diagnostic">{copy.diagnostic}</option>
          <option value="manual">{copy.manual}</option>
          <option value="ignored">{copy.ignored}</option>
          <option value="lighting">{copy.lighting}</option>
          <option value="family">{copy.family}</option>
          <option value="homelab">{copy.homelab}</option>
          <option value="energy">{copy.energy}</option>
        </Select>
        <Button variant="secondary" onClick={() => void load()} loading={loading}>
          {copy.refresh}
        </Button>
        <div className="flex flex-wrap gap-2 md:col-span-3">
          <Button size="small" variant="ghost" onClick={exportConfig}>
            {copy.exportConfig}
          </Button>
          <Button size="small" variant="ghost" onClick={() => importInputRef.current?.click()}>
            {copy.importConfig}
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
            {confirmReset ? copy.confirmReset : copy.resetHomeOs}
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
        <p className="px-5 py-3 text-sm text-amber-500">{copy.recoveredBackup}</p>
      ) : null}
      <div
        className={cn(
          'mx-4 grid grid-cols-2 gap-2 rounded-xl border p-3 text-xs sm:grid-cols-5 md:mx-5',
          controller.styles.insetBorderColor
        )}
      >
        <strong className={cn('col-span-2 sm:col-span-5', controller.styles.textColor)}>
          {copy.diagnosticsSummary}
        </strong>
        <span>
          {copy.mapped}: {diagnostics.mapped}
        </span>
        <span>
          {copy.needsReview}: {diagnostics.review}
        </span>
        <span>
          {copy.manual}: {diagnostics.manual}
        </span>
        <span>
          {copy.ignored}: {diagnostics.ignored}
        </span>
        <span>
          {copy.diagnostic}: {diagnostics.diagnostic}
        </span>
        <span>
          {copy.pve}: {diagnostics.pve}
        </span>
        <span>
          {copy.router}: {diagnostics.router}
        </span>
        <span>
          {copy.internet}: {diagnostics.internet}
        </span>
        <span>
          {copy.lightingCircuits}: {diagnostics.lightingCircuits}
        </span>
        <span>
          {copy.weatherSource}: {diagnostics.weatherSource}
        </span>
        <span>
          {copy.detectedMetrics}: {copy.airQuality} {diagnostics.airMetrics}
        </span>
        <span>
          {copy.sunEntity}: {diagnostics.sunEntity}
        </span>
        <span>
          {copy.moonSource}: {diagnostics.moonSource}
        </span>
        <span>
          {copy.routerNegativeCandidates}: {diagnostics.routerNegatives}
        </span>
        <span>
          {copy.temperatureDiagnostics}: {diagnostics.environmentTemperature} /{' '}
          {diagnostics.refrigerationTemperature} / {diagnostics.pveTemperature} /{' '}
          {diagnostics.internalTemperature}
        </span>
      </div>
      {selectedIds.size ? (
        <div className="mx-4 mt-3 grid gap-2 md:mx-5 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_auto_auto]">
          <Input
            value={batchPhysicalDeviceId}
            onChange={(event) => setBatchPhysicalDeviceId(event.target.value)}
            placeholder={copy.batchPhysicalDevice}
            aria-label={copy.batchPhysicalDevice}
          />
          <Select
            value={batchDisplayMode}
            onChange={(event) =>
              setBatchDisplayMode(event.target.value as ManualEntityMapping['displayMode'])
            }
            aria-label={copy.displayMode}
          >
            <option value="primary">{copy.primary}</option>
            <option value="detail">{copy.detail}</option>
            <option value="diagnostic">{copy.diagnostic}</option>
            <option value="hidden">{copy.hidden}</option>
          </Select>
          <Button
            size="small"
            variant="secondary"
            loading={saving}
            onClick={() => void batchUpdate(false)}
          >
            {copy.applyBatch} ({selectedIds.size})
          </Button>
          <Button
            size="small"
            variant="ghost"
            disabled={saving}
            onClick={() => void batchUpdate(true)}
          >
            {copy.ignoreBatch}
          </Button>
          <Input
            value={circuitName}
            onChange={(event) => setCircuitName(event.target.value)}
            placeholder={copy.lightingCircuitName}
            aria-label={copy.lightingCircuitName}
          />
          <Input
            value={circuitRoom}
            onChange={(event) => setCircuitRoom(event.target.value)}
            placeholder={copy.lightingCircuitRoom}
            aria-label={copy.lightingCircuitRoom}
          />
          <Button
            size="small"
            variant="secondary"
            loading={saving}
            onClick={() => void createLightingCircuit()}
          >
            {copy.createLightingCircuit} ({selectedIds.size})
          </Button>
        </div>
      ) : null}
      <div className="flex items-center justify-between px-5 py-3 text-xs">
        <span className={controller.styles.subtleColor}>
          {visible.length} / {resolved.length} {copy.mappingCount} · {copy.revision}{' '}
          {config.revision}
        </span>
        <span className={cn(controller.styles.subtleColor, 'hidden sm:inline')}>
          {copy.manualWins}
        </span>
      </div>
      {visible.length ? (
        visible.slice(0, visibleLimit).map((item) => (
          <EntityMappingRow
            key={item.entity.canonicalId}
            resolved={item}
            styles={controller.styles}
            saving={saving}
            selected={selectedIds.has(item.entity.externalId)}
            onSelectionChange={(selected) =>
              setSelectedIds((current) => {
                const next = new Set(current);
                if (selected) next.add(item.entity.externalId);
                else next.delete(item.entity.externalId);
                return next;
              })
            }
            onEdit={() => setEditing(item.entity)}
            onIgnore={() => void ignore(item)}
            onRestoreAuto={() => void removeMapping(item.entity.externalId)}
          />
        ))
      ) : (
        <p className={cn('px-5 py-10 text-center text-sm', controller.styles.subtleColor)}>
          {copy.noMatchingEntities}
        </p>
      )}
      {visible.length > visibleLimit ? (
        <div className="px-5 py-4 text-center">
          <Button variant="secondary" onClick={() => setVisibleLimit((current) => current + 160)}>
            {copy.showMore} ({visible.length - visibleLimit})
          </Button>
        </div>
      ) : null}
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
