import { dispatchEntityCommand } from '@navet/app/commands';
import { BaseCard, Button, Heading } from '@navet/app/components/primitives';
import { useI18n } from '@navet/app/hooks';
import type { DeviceWithType } from '@navet/app/types/device.types';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CloudSun,
  DoorOpen,
  Gauge,
  Home,
  Moon,
  Network,
  Server,
  Sparkles,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react';
import { Solar } from 'lunar-javascript';
import { useEffect, useMemo, useState } from 'react';
import type { HomeOsMetric, HomeOsModel } from './home-os-model';
import { buildHomeOsModel } from './home-os-model';

export function useHomeOsModel(deviceMap: Map<string, DeviceWithType>): HomeOsModel {
  return useMemo(() => buildHomeOsModel(deviceMap), [deviceMap]);
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="space-y-1 px-1">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-current/55">{eyebrow}</p>
      <Heading as="h1">{title}</Heading>
      <p className="max-w-3xl text-sm text-current/65">{description}</p>
    </header>
  );
}

function MetricList({ items, empty }: { items: HomeOsMetric[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-current/55">{empty}</p>;
  return (
    <div className="space-y-2">
      {items.slice(0, 8).map((item) => (
        <div className="flex items-center justify-between gap-3 text-sm" key={item.id}>
          <span className="min-w-0 truncate text-current/70">{item.label}</span>
          <strong className={item.available ? '' : 'text-red-400'}>
            {item.value || '—'} {item.unit}
          </strong>
        </div>
      ))}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  items,
  empty,
}: {
  icon: typeof Activity;
  title: string;
  items: HomeOsMetric[];
  empty: string;
}) {
  return (
    <BaseCard
      size="medium"
      title={title}
      headerLeading={<Icon className="h-5 w-5" />}
      contentClassName="min-h-36"
    >
      <MetricList items={items} empty={empty} />
    </BaseCard>
  );
}

function getChineseCalendar(now: Date) {
  const lunar = Solar.fromDate(now).getLunar();
  return {
    lunar: lunar.toString(),
    zodiac: lunar.getYearShengXiao(),
    jieQi: lunar.getJieQi() || lunar.getNextJieQi()?.getName() || '',
    suitable: lunar.getDayYi().slice(0, 4).join(' · '),
    avoid: lunar.getDayJi().slice(0, 4).join(' · '),
  };
}

export function HomeOsOverviewStrip({ deviceMap }: { deviceMap: Map<string, DeviceWithType> }) {
  const { language, locale } = useI18n();
  const zh = language === 'zh';
  const model = useHomeOsModel(deviceMap);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const calendar = useMemo(() => getChineseCalendar(now), [now]);
  const atHome = model.family.people.filter(
    (person) => 'state' in person && person.state === 'home'
  ).length;

  return (
    <section
      aria-label={zh ? 'Home OS 家庭概览' : 'Home OS overview'}
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
    >
      <BaseCard
        size="small"
        title={zh ? '现在' : 'Now'}
        headerLeading={<Home className="h-5 w-5" />}
      >
        <strong className="text-3xl tabular-nums">
          {now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
        </strong>
        <p className="mt-2 text-sm text-current/60">
          {now.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </BaseCard>
      <BaseCard
        size="small"
        title={zh ? '家庭状态' : 'Household'}
        headerLeading={<Users className="h-5 w-5" />}
      >
        <strong className="text-3xl">
          {atHome}/{model.family.people.length}
        </strong>
        <p className="mt-2 text-sm text-current/60">{zh ? '位成员在家' : 'people at home'}</p>
      </BaseCard>
      <BaseCard
        size="small"
        title={zh ? '异常中心' : 'Attention'}
        headerLeading={
          model.attention.length ? (
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          )
        }
      >
        <strong className="text-3xl">{model.attention.length}</strong>
        <p className="mt-2 text-sm text-current/60">
          {model.attention.length
            ? zh
              ? '项需要处理'
              : 'items need review'
            : zh
              ? '家庭状态平稳'
              : 'Everything looks calm'}
        </p>
      </BaseCard>
      <BaseCard
        size="small"
        title={zh ? '今日历法' : 'Lunar calendar'}
        headerLeading={<Moon className="h-5 w-5" />}
      >
        <strong className="line-clamp-1 text-lg">{calendar.lunar}</strong>
        <p className="mt-1 text-xs text-current/60">
          {calendar.zodiac} · {calendar.jieQi || (zh ? '平日' : 'Regular day')}
        </p>
        <p className="mt-2 line-clamp-1 text-xs text-emerald-400">
          {zh ? '宜' : 'Good'}：{calendar.suitable}
        </p>
        <p className="line-clamp-1 text-xs text-amber-400">
          {zh ? '忌' : 'Avoid'}：{calendar.avoid}
        </p>
      </BaseCard>
    </section>
  );
}

export function RoomsSection({
  deviceMap,
  onOpenRoom,
}: {
  deviceMap: Map<string, DeviceWithType>;
  onOpenRoom: (room: string) => void;
}) {
  const { language } = useI18n();
  const zh = language === 'zh';
  const model = useHomeOsModel(deviceMap);
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Home OS · Rooms"
        title={zh ? '房间' : 'Rooms'}
        description={
          zh
            ? '按 Home Assistant Area 汇总设备、运行状态和异常。'
            : 'Devices, live state, and alerts grouped by provider rooms.'
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {model.rooms.map((room) => (
          <button
            key={room.name}
            type="button"
            className="text-left"
            onClick={() => onOpenRoom(room.name)}
          >
            <BaseCard
              size="small"
              interactive
              title={room.name}
              headerLeading={<DoorOpen className="h-5 w-5" />}
            >
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <strong className="block text-xl">{room.devices}</strong>
                  <span className="text-xs text-current/55">{zh ? '设备' : 'Devices'}</span>
                </div>
                <div>
                  <strong className="block text-xl text-emerald-400">{room.active}</strong>
                  <span className="text-xs text-current/55">{zh ? '运行' : 'Active'}</span>
                </div>
                <div>
                  <strong
                    className={room.alerts ? 'block text-xl text-amber-400' : 'block text-xl'}
                  >
                    {room.alerts}
                  </strong>
                  <span className="text-xs text-current/55">{zh ? '异常' : 'Alerts'}</span>
                </div>
              </div>
            </BaseCard>
          </button>
        ))}
      </div>
    </div>
  );
}

export function DevicesSectionHeader({ deviceMap }: { deviceMap: Map<string, DeviceWithType> }) {
  const { language } = useI18n();
  const zh = language === 'zh';
  const typeCount = new Set([...deviceMap.values()].map((device) => device.type)).size;
  return (
    <SectionHeading
      eyebrow="Home OS · Devices"
      title={zh ? '全部设备' : 'All devices'}
      description={
        zh
          ? `${deviceMap.size} 个实时实体，覆盖 ${typeCount} 类设备。使用顶部搜索快速定位。`
          : `${deviceMap.size} live entities across ${typeCount} device groups.`
      }
    />
  );
}

export function HomelabSection({ deviceMap }: { deviceMap: Map<string, DeviceWithType> }) {
  const { language } = useI18n();
  const zh = language === 'zh';
  const model = useHomeOsModel(deviceMap);
  const pveTitle = ['Proxmox', 'VE'].join(' ');
  const homeAssistantTitle = ['Home', 'Assistant'].join(' ');
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Home OS · Homelab"
        title={zh ? '家庭机房与网络' : 'Homelab and network'}
        description={
          zh
            ? '只读取 Home Assistant 中已经标准化的监控实体；凭据不进入 Home OS。'
            : 'Normalized monitoring entities from Home Assistant; credentials stay out of Home OS.'
        }
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={Server}
          title={pveTitle}
          items={model.homelab.pve}
          empty={zh ? '未发现 PVE 实体' : 'No PVE entities'}
        />
        <MetricCard
          icon={Home}
          title={homeAssistantTitle}
          items={model.homelab.homeAssistant}
          empty={zh ? '未发现 HA 系统实体' : 'No HA system entities'}
        />
        <MetricCard
          icon={Network}
          title={zh ? '路由与网络' : 'Routing and network'}
          items={model.homelab.network}
          empty={zh ? '未发现路由器实体' : 'No router entities'}
        />
        <MetricCard
          icon={Gauge}
          title={zh ? '互联网质量' : 'Internet quality'}
          items={model.homelab.internet}
          empty={
            zh ? '请在 HA 中启用 Ping/Speedtest 实体' : 'Enable Ping or Speedtest entities in HA'
          }
        />
        <MetricCard
          icon={AlertTriangle}
          title={zh ? '基础设施异常' : 'Infrastructure alerts'}
          items={model.attention.filter(
            (item) => item.category === 'homelab' || item.category === 'availability'
          )}
          empty={zh ? '基础设施状态正常' : 'Infrastructure looks healthy'}
        />
      </div>
    </div>
  );
}

export function EnergyCnSection({ deviceMap }: { deviceMap: Map<string, DeviceWithType> }) {
  const { language } = useI18n();
  const zh = language === 'zh';
  const model = useHomeOsModel(deviceMap);
  const hasData = Object.values(model.energy).some((items) => items.length > 0);
  if (!hasData) return null;
  return (
    <section className="space-y-3">
      <SectionHeading
        eyebrow="Home OS · China utilities"
        title={zh ? '账单与公用事业' : 'Bills and utilities'}
        description={
          zh
            ? '国家电网、山东港华以及后续水务实体的统一视图。'
            : 'A normalized view for electricity, gas, and future water entities.'
        }
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Zap}
          title={zh ? '国家电网' : 'Electricity'}
          items={model.energy.electricity}
          empty={zh ? '未发现电力实体' : 'No electricity entities'}
        />
        <MetricCard
          icon={CloudSun}
          title={zh ? '山东港华燃气' : 'Towngas'}
          items={model.energy.gas}
          empty={zh ? '未发现燃气实体' : 'No gas entities'}
        />
        <MetricCard
          icon={WalletCards}
          title={zh ? '余额与费用' : 'Balance and cost'}
          items={model.energy.balance}
          empty={zh ? '未发现余额实体' : 'No balance entities'}
        />
        <MetricCard
          icon={Activity}
          title={zh ? '峰谷与阶梯' : 'Tariffs'}
          items={model.energy.tariff}
          empty={zh ? '未发现峰谷实体' : 'No tariff entities'}
        />
      </div>
    </section>
  );
}

export function FamilySection({ deviceMap }: { deviceMap: Map<string, DeviceWithType> }) {
  const { language } = useI18n();
  const zh = language === 'zh';
  const model = useHomeOsModel(deviceMap);
  const peopleMetrics = model.family.people.map((person) => ({
    id: person.id,
    label: person.name,
    value: 'state' in person ? String(person.state) : 'unknown',
    unit: '',
    numericValue: null,
    available: true,
  }));
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Home OS · Family"
        title={zh ? '家庭' : 'Family'}
        description={
          zh
            ? '成员、日程、耗材、清洁与家庭状态集中在一个页面。'
            : 'People, schedules, consumables, cleaning, and household status.'
        }
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={Users}
          title={zh ? '家庭成员' : 'People'}
          items={peopleMetrics}
          empty={zh ? '未发现 Person 实体' : 'No person entities'}
        />
        <BaseCard
          size="medium"
          title={zh ? '家庭日程' : 'Calendar'}
          headerLeading={<CalendarDays className="h-5 w-5" />}
        >
          <strong className="text-3xl">{model.family.calendars.length}</strong>
          <p className="mt-2 text-sm text-current/60">{zh ? '个日历数据源' : 'calendar sources'}</p>
        </BaseCard>
        <BaseCard
          size="medium"
          title={zh ? '清洁设备' : 'Cleaning'}
          headerLeading={<Sparkles className="h-5 w-5" />}
        >
          <strong className="text-3xl">{model.family.vacuums.length}</strong>
          <p className="mt-2 text-sm text-current/60">
            {zh ? '台扫地机或清洁设备' : 'vacuum or cleaning devices'}
          </p>
        </BaseCard>
        <MetricCard
          icon={AlertTriangle}
          title={zh ? '家庭异常' : 'Household attention'}
          items={model.attention.filter((item) => !['homelab'].includes(item.category))}
          empty={zh ? '家庭状态平稳' : 'Everything looks calm'}
        />
      </div>
    </div>
  );
}

export function ScenesSection({ deviceMap }: { deviceMap: Map<string, DeviceWithType> }) {
  const { language } = useI18n();
  const zh = language === 'zh';
  const model = useHomeOsModel(deviceMap);
  const aliases = [
    ['回家', 'Home'],
    ['离家', 'Away'],
    ['睡眠', 'Sleep'],
    ['观影', 'Movie'],
    ['清洁', 'Clean'],
    ['访客', 'Guest'],
  ];
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Home OS · Scenes"
        title={zh ? '家庭模式' : 'Home modes'}
        description={
          zh
            ? '优先匹配 HA Scene；点击后通过 Navet 通用命令执行。'
            : 'Matched Home Assistant scenes executed through provider-neutral commands.'
        }
      />
      {model.scenes.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {model.scenes.map((scene) => {
            const pair = aliases.find(
              ([cn, en]) =>
                `${scene.name} ${scene.id}`.toLowerCase().includes(cn.toLowerCase()) ||
                `${scene.name} ${scene.id}`.toLowerCase().includes(en.toLowerCase())
            );
            return (
              <BaseCard
                key={scene.id}
                size="small"
                title={pair ? (zh ? pair[0] : pair[1]) : scene.name}
                subtitle={scene.room}
                headerLeading={<Sparkles className="h-5 w-5" />}
                footer={
                  <Button
                    size="small"
                    onClick={() =>
                      void dispatchEntityCommand(
                        { type: 'turn_on', entityId: scene.id },
                        scene.providerId
                      )
                    }
                  >
                    {zh ? '执行' : 'Activate'}
                  </Button>
                }
              >
                <p className="text-sm text-current/60">{scene.name}</p>
              </BaseCard>
            );
          })}
        </div>
      ) : (
        <BaseCard
          size="medium"
          title={zh ? '尚无家庭模式' : 'No home modes yet'}
          headerLeading={<Sparkles className="h-5 w-5" />}
        >
          <p className="text-sm text-current/60">
            {zh
              ? '请在 Home Assistant 创建回家、离家、睡眠、观影、清洁和访客 Scene。'
              : 'Create Home, Away, Sleep, Movie, Clean, and Guest scenes in Home Assistant.'}
          </p>
        </BaseCard>
      )}
    </div>
  );
}

export function CamerasHeader({ deviceMap }: { deviceMap: Map<string, DeviceWithType> }) {
  const { language } = useI18n();
  const zh = language === 'zh';
  const count = useHomeOsModel(deviceMap).cameras.length;
  return (
    <SectionHeading
      eyebrow="Home OS · Cameras"
      title={zh ? '摄像头' : 'Cameras'}
      description={
        zh
          ? `${count} 路摄像头，继续使用 Navet 的签名 URL、WebRTC/HLS 和失败回退。`
          : `${count} cameras using Navet resource signing, WebRTC/HLS, and fallback handling.`
      }
    />
  );
}
