import { HOME_OS_ROLES, type SemanticRole } from './core/semantic-roles';

export type HomeOsExtensionId = 'alerts' | 'energy-cn' | 'family' | 'homelab' | 'lighting';

export interface ExtensionDefinition {
  id: HomeOsExtensionId;
  title: string;
  capabilities: readonly ('read' | 'control' | 'history' | 'stream' | 'configure')[];
  cards: readonly string[];
  pages: readonly string[];
  semanticRoles: {
    required: readonly SemanticRole[];
    optional: readonly SemanticRole[];
  };
  requiredCapabilities: readonly string[];
  providerRequirements: readonly string[];
  historyRequirements: readonly string[];
  controlRequirements: readonly string[];
}

export const HOME_OS_EXTENSIONS: readonly ExtensionDefinition[] = [
  {
    id: 'family',
    title: 'Family',
    capabilities: ['read', 'configure'],
    cards: ['home-os.household-status'],
    pages: [],
    semanticRoles: {
      required: [HOME_OS_ROLES.familyPerson],
      optional: [HOME_OS_ROLES.familyTracker],
    },
    requiredCapabilities: [],
    providerRequirements: [],
    historyRequirements: [],
    controlRequirements: [],
  },
  {
    id: 'lighting',
    title: 'Whole-home lighting',
    capabilities: ['read', 'control', 'configure'],
    cards: ['home-os.whole-home-lighting'],
    pages: [],
    semanticRoles: {
      required: [],
      optional: [HOME_OS_ROLES.lightingLight, HOME_OS_ROLES.lightingSwitch],
    },
    requiredCapabilities: [],
    providerRequirements: [],
    historyRequirements: [],
    controlRequirements: ['toggle'],
  },
  {
    id: 'alerts',
    title: 'Attention center',
    capabilities: ['read', 'configure'],
    cards: ['home-os.attention-center'],
    pages: [],
    semanticRoles: { required: [], optional: ['security.*', 'diagnostic.*', 'homelab.*'] },
    requiredCapabilities: [],
    providerRequirements: [],
    historyRequirements: [],
    controlRequirements: [],
  },
  {
    id: 'homelab',
    title: 'Homelab',
    capabilities: ['read', 'history', 'configure'],
    cards: ['home-os.pve', 'home-os.home-assistant', 'home-os.router', 'home-os.internet'],
    pages: ['home-os.homelab'],
    semanticRoles: { required: [], optional: ['homelab.*', 'network.*'] },
    requiredCapabilities: [],
    providerRequirements: [],
    historyRequirements: ['history'],
    controlRequirements: [],
  },
  {
    id: 'energy-cn',
    title: 'Energy and utilities',
    capabilities: ['read', 'history', 'configure'],
    cards: ['home-os.energy', 'home-os.gas'],
    pages: ['home-os.energy-detail'],
    semanticRoles: { required: [], optional: ['energy.electricity.*', 'energy.gas.*'] },
    requiredCapabilities: [],
    providerRequirements: [],
    historyRequirements: ['history', 'statistics'],
    controlRequirements: [],
  },
] as const;

export function getHomeOsExtension(id: HomeOsExtensionId) {
  return HOME_OS_EXTENSIONS.find((extension) => extension.id === id);
}
