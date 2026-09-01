import type { CardSize } from '@navet/app/components/shared/card-size-selector';

export type HomeOsCardKind =
  | 'household'
  | 'lighting'
  | 'alerts'
  | 'pve'
  | 'home-assistant'
  | 'router'
  | 'internet'
  | 'electricity'
  | 'gas'
  | 'weather'
  | 'air-quality'
  | 'calendar'
  | 'modes'
  | 'cleaning'
  | 'lunar';

export type HomeOsCardTemplateId = `home-os:${HomeOsCardKind}`;

export interface HomeOsCardDefinition {
  kind: HomeOsCardKind;
  templateId: HomeOsCardTemplateId;
  name: { en: string; zh: string };
  description: { en: string; zh: string };
  defaultSize: CardSize;
  supportedSizes: CardSize[];
  semanticRolePrefixes: string[];
}

const card = (
  kind: HomeOsCardKind,
  name: HomeOsCardDefinition['name'],
  description: HomeOsCardDefinition['description'],
  semanticRolePrefixes: string[],
  defaultSize: CardSize = 'medium'
): HomeOsCardDefinition => ({
  kind,
  templateId: `home-os:${kind}`,
  name,
  description,
  defaultSize,
  supportedSizes: ['small', 'medium', 'large'],
  semanticRolePrefixes,
});

export const HOME_OS_CARD_REGISTRY: readonly HomeOsCardDefinition[] = [
  card(
    'household',
    { en: 'Home OS · Household', zh: 'Home OS · 家庭状态' },
    {
      en: 'Who is home and the latest reliable location state.',
      zh: '显示家庭成员在家与可靠位置状态。',
    },
    ['family.']
  ),
  card(
    'lighting',
    { en: 'Home OS · Whole-home lighting', zh: 'Home OS · 全屋灯光' },
    {
      en: 'Real lights and manually approved lighting switches.',
      zh: '真实灯具和手动确认的照明开关。',
    },
    ['lighting.']
  ),
  card(
    'alerts',
    { en: 'Home OS · Attention center', zh: 'Home OS · 异常中心' },
    {
      en: 'Duration-aware household and infrastructure alerts.',
      zh: '带持续时间判断的家庭与基础设施异常。',
    },
    ['security.', 'diagnostic.', 'homelab.']
  ),
  card(
    'pve',
    { en: 'Home OS · PVE', zh: 'Home OS · PVE' },
    { en: 'Proxmox health and load.', zh: 'Proxmox 健康与负载。' },
    ['homelab.pve.']
  ),
  card(
    'home-assistant',
    { en: 'Home OS · Home Assistant', zh: 'Home OS · Home Assistant' },
    { en: 'Home Assistant runtime health.', zh: 'Home Assistant 运行状态。' },
    ['homelab.home_assistant.']
  ),
  card(
    'router',
    { en: 'Home OS · Main router', zh: 'Home OS · 主路由' },
    { en: 'Router, gateway, and client status.', zh: '路由器、网关和客户端状态。' },
    ['network.router.']
  ),
  card(
    'internet',
    { en: 'Home OS · Internet', zh: 'Home OS · Internet' },
    { en: 'WAN availability, latency, and packet loss.', zh: '外网可用性、延迟与丢包。' },
    ['network.internet.']
  ),
  card(
    'electricity',
    { en: 'Home OS · Electricity', zh: 'Home OS · 国家电网' },
    { en: 'Electricity usage and balance summary.', zh: '用电量与余额摘要。' },
    ['energy.electricity.']
  ),
  card(
    'gas',
    { en: 'Home OS · Gas', zh: 'Home OS · 燃气' },
    { en: 'Gas usage and account summary.', zh: '燃气用量与账户摘要。' },
    ['energy.gas.']
  ),
  card(
    'weather',
    { en: 'Home OS · Weather', zh: 'Home OS · 天气增强' },
    { en: 'Current weather from the configured provider.', zh: '来自已配置 Provider 的实时天气。' },
    ['weather.']
  ),
  card(
    'air-quality',
    { en: 'Home OS · Air quality', zh: 'Home OS · 空气质量' },
    { en: 'AQI, particles, and carbon dioxide.', zh: '空气质量、颗粒物与二氧化碳。' },
    ['environment.air_quality.']
  ),
  card(
    'calendar',
    { en: 'Home OS · Family calendar', zh: 'Home OS · 家庭日历' },
    { en: 'Upcoming state from family calendars.', zh: '家庭日历的近期状态。' },
    ['family.calendar']
  ),
  card(
    'modes',
    { en: 'Home OS · Home modes', zh: 'Home OS · 家庭模式' },
    {
      en: 'Provider-neutral Home, Away, Sleep, and other scenes.',
      zh: '回家、离家、睡眠等场景模式。',
    },
    ['home.mode']
  ),
  card(
    'cleaning',
    { en: 'Home OS · Cleaning', zh: 'Home OS · 扫地机摘要' },
    { en: 'Vacuum and cleaning status.', zh: '扫地机和清洁设备状态。' },
    ['home.cleaning']
  ),
  card(
    'lunar',
    { en: 'Home OS · Lunar calendar', zh: 'Home OS · 农历节气' },
    { en: 'Local lunar date, solar term, and daily guidance.', zh: '本地计算农历、节气与宜忌。' },
    []
  ),
];

export const getHomeOsCardDefinition = (kind: unknown) =>
  HOME_OS_CARD_REGISTRY.find((definition) => definition.kind === kind);
