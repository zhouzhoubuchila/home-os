import { create } from 'zustand';
import { createDefaultHomeOsConfig, type HomeOsConfig } from '../config/schema';
import { homeOsConfigStorage } from '../config/storage';
import type { ManualEntityMapping } from '../core/types';
import { upsertManualMapping } from '../mapping/manual-overrides';

interface HomeOsConfigState {
  config: HomeOsConfig;
  loading: boolean;
  loaded: boolean;
  saving: boolean;
  recovered: boolean;
  error: string | null;
  load: () => Promise<void>;
  save: (config: HomeOsConfig) => Promise<void>;
  reset: () => Promise<void>;
  upsertMapping: (mapping: ManualEntityMapping) => Promise<void>;
  removeMapping: (entityId: string) => Promise<void>;
}

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Home OS configuration request failed';

export const useHomeOsConfigStore = create<HomeOsConfigState>((set, get) => ({
  config: createDefaultHomeOsConfig(),
  loading: false,
  loaded: false,
  saving: false,
  recovered: false,
  error: null,
  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const result = await homeOsConfigStorage.load();
      set({ config: result.config, recovered: result.recovered, loading: false, loaded: true });
    } catch (error) {
      set({ error: messageOf(error), loading: false });
    }
  },
  save: async (config) => {
    set({ saving: true, error: null });
    try {
      const result = await homeOsConfigStorage.save(config);
      set({ config: result.config, recovered: result.recovered, saving: false });
    } catch (error) {
      set({ error: messageOf(error), saving: false });
      throw error;
    }
  },
  reset: async () => {
    set({ saving: true, error: null });
    try {
      const result = await homeOsConfigStorage.reset(get().config.revision);
      set({ config: result.config, recovered: false, saving: false });
    } catch (error) {
      set({ error: messageOf(error), saving: false });
      throw error;
    }
  },
  upsertMapping: async (mapping) => {
    const current = get().config;
    await get().save({ ...current, mappings: upsertManualMapping(current.mappings, mapping) });
  },
  removeMapping: async (entityId) => {
    const current = get().config;
    await get().save({
      ...current,
      mappings: current.mappings.filter((mapping) => mapping.entityId !== entityId),
    });
  },
}));
