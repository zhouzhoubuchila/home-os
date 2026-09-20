import Swiper from 'swiper';
import { Keyboard, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { useEffect, useRef } from 'react';
import type { MoonCardModel } from './moon-card-model';

interface DataItem {
  key: string;
  label: string;
  value: string;
  direction?: number;
}

function formatTime(value: Date | undefined, locale: string) {
  return value?.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) ?? '—';
}

function formatDate(value: Date | undefined, locale: string) {
  return value?.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) ?? '—';
}

function pagesFor(model: MoonCardModel, language: string, chunkedLimit: number): DataItem[][] {
  const zh = language === 'zh';
  const locale = zh ? 'zh-CN' : 'en-US';
  const degree = (value?: number) => (value === undefined ? '—' : `${value.toFixed(1)}°`);
  const items: DataItem[] = [
    {
      key: 'age',
      label: zh ? '月龄' : 'Moon age',
      value: `${model.ageDays.toFixed(1)} ${zh ? '天' : 'days'}`,
    },
    {
      key: 'rise',
      label: zh ? '月出' : 'Moonrise',
      value: formatTime(model.moonrise, locale),
    },
    {
      key: 'set',
      label: zh ? '月落' : 'Moonset',
      value: formatTime(model.moonset, locale),
    },
    {
      key: 'illumination',
      label: zh ? '照明' : 'Illumination',
      value: `${model.illuminationPercent}%`,
    },
    { key: 'altitude', label: zh ? '高度' : 'Altitude', value: degree(model.altitude) },
    {
      key: 'direction',
      label: zh ? '方位' : 'Azimuth',
      value: degree(model.azimuth),
      direction: model.azimuth,
    },
    {
      key: 'high',
      label: zh ? '最高点' : 'Moon high',
      value: formatTime(model.moonHighest, locale),
    },
    {
      key: 'distance',
      label: zh ? '距离' : 'Distance',
      value: model.distanceKm ? `${Math.round(model.distanceKm).toLocaleString(locale)} km` : '—',
    },
    {
      key: 'full',
      label: zh ? '下次满月' : 'Next full moon',
      value: formatDate(model.nextFullMoon, locale),
    },
    {
      key: 'new',
      label: zh ? '下次新月' : 'Next new moon',
      value: formatDate(model.nextNewMoon, locale),
    },
    {
      key: 'date',
      label: zh ? '查看日期' : 'Viewing date',
      value: model.date.toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
    },
    {
      key: 'phase',
      label: zh ? '下次月相' : 'Next phase',
      value: formatDate(model.nextFullMoon ?? model.nextNewMoon, locale),
    },
  ];
  const pages: DataItem[][] = [];
  for (let index = 0; index < items.length; index += chunkedLimit) {
    pages.push(items.slice(index, index + chunkedLimit));
  }
  return pages;
}

/** Direct React host for upstream moon-data-info's Swiper behavior. */
export function MoonDataSwiper({
  model,
  language,
  chunkedLimit = 5,
}: {
  model: MoonCardModel;
  language: string;
  chunkedLimit?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<Swiper | null>(null);
  const pages = pagesFor(model, language, chunkedLimit);

  useEffect(() => {
    const root = rootRef.current;
    const pagination = root?.querySelector<HTMLElement>('.swiper-pagination');
    if (!root || !pagination) return;
    const swiper = new Swiper(root, {
      modules: [Keyboard, Pagination],
      centeredSlides: true,
      grabCursor: true,
      roundLengths: true,
      spaceBetween: 12,
      keyboard: { enabled: true, onlyInViewport: true },
      loop: false,
      slidesPerView: 1,
      pagination: { el: pagination, clickable: true },
    });
    swiperRef.current = swiper;
    return () => {
      swiper.destroy(true, true);
      swiperRef.current = null;
    };
  }, []);

  useEffect(() => {
    swiperRef.current?.update();
  }, [model]);

  return (
    <div
      ref={rootRef}
      className="swiper relative h-auto min-h-0 w-full overflow-hidden [--swiper-pagination-bullet-inactive-color:currentColor] [--swiper-pagination-bullet-inactive-opacity:0.22] [--swiper-theme-color:currentColor] [&_.swiper-pagination-bullet]:!transition-all [&_.swiper-pagination-bullet-active]:!w-3 [&_.swiper-pagination-bullet-active]:!rounded-full"
      data-card-interactive
      data-lunar-swiper
      data-lunar-swiper-grab-cursor="true"
      data-lunar-swiper-keyboard="true"
    >
      <div className="swiper-wrapper">
        {pages.map((page, index) => (
          <div className="swiper-slide" key={`page-${index + 1}`} data-lunar-data-page={index + 1}>
            <div className="flex w-full flex-col pb-2 pt-1">
              {page.map((item) => (
                <div
                  className="flex w-full items-center border-b border-current/10 py-[3px] text-[0.68rem] last:border-b-0"
                  key={item.key}
                >
                  <span className="mr-auto truncate text-current/55">{item.label}</span>
                  <span className="flex min-w-0 items-center gap-1 font-medium tabular-nums">
                    {item.value}
                    {item.direction === undefined ? null : (
                      <span
                        aria-hidden="true"
                        className="inline-block text-current/55 transition-transform duration-300"
                        style={{ transform: `rotate(${item.direction}deg)` }}
                      >
                        ↑
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="swiper-pagination !bottom-0 !flex !h-6 !items-center !justify-center !pl-0.5" />
    </div>
  );
}
