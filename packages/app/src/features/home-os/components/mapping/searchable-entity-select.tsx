import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ResolvedSemanticEntity } from '../../core/types';
import { buildHomeOsMappingSearchIndex } from '../../mapping/search-index';

const RESULT_LIMIT = 75;

interface SearchableEntitySelectProps {
  id: string;
  ariaLabel: string;
  entities: readonly ResolvedSemanticEntity[];
  initialEntityIds: readonly string[];
  value: string;
  onChange: (value: string) => void;
  emptyLabel: string;
  searchPlaceholder: string;
  selectedGroupLabel: string;
  otherGroupLabel: string;
  clearLabel: string;
  noResultsLabel: string;
}

const attributeText = (value: unknown) => (typeof value === 'string' ? value : '');

function entityContext(item: ResolvedSemanticEntity) {
  const attributes = item.entity.attributes;
  return [
    item.room,
    attributeText(attributes.deviceName ?? attributes.device_name),
    attributeText(attributes.integration ?? attributes.platform),
  ]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(' · ');
}

function deduplicate(items: readonly ResolvedSemanticEntity[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = item.entity.externalId;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function SearchableEntitySelect({
  id,
  ariaLabel,
  entities,
  initialEntityIds,
  value,
  onChange,
  emptyLabel,
  searchPlaceholder,
  selectedGroupLabel,
  otherGroupLabel,
  clearLabel,
  noResultsLabel,
}: SearchableEntitySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const sortedEntities = useMemo(
    () =>
      deduplicate(
        [...entities].sort((left, right) => left.displayName.localeCompare(right.displayName))
      ),
    [entities]
  );
  const entityById = useMemo(
    () => new Map(sortedEntities.map((item) => [item.entity.externalId, item])),
    [sortedEntities]
  );
  const searchIndex = useMemo(
    () => buildHomeOsMappingSearchIndex(sortedEntities),
    [sortedEntities]
  );
  const preferredEntities = useMemo(
    () =>
      deduplicate(
        [...initialEntityIds, value]
          .filter(Boolean)
          .map((entityId) => entityById.get(entityId))
          .filter((item): item is ResolvedSemanticEntity => Boolean(item))
      ),
    [entityById, initialEntityIds, value]
  );
  const preferredSet = useMemo(
    () => new Set(preferredEntities.map((item) => item.entity.externalId)),
    [preferredEntities]
  );
  const otherEntities = useMemo(() => {
    if (!query.trim()) return [];
    const matches = searchIndex
      .search(query)
      .filter((item) => !preferredSet.has(item.entity.externalId));
    return deduplicate(matches).slice(0, RESULT_LIMIT);
  }, [preferredSet, query, searchIndex]);
  const visibleEntities = useMemo(
    () => [...preferredEntities, ...otherEntities],
    [otherEntities, preferredEntities]
  );
  const selectedEntity = entityById.get(value);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(visibleEntities.length - 1, 0)));
  }, [visibleEntities.length]);

  const choose = (entityId: string) => {
    onChange(entityId);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (!visibleEntities.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % visibleEntities.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + visibleEntities.length) % visibleEntities.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(visibleEntities[activeIndex]?.entity.externalId ?? '');
    }
  };

  const renderGroup = (label: string, items: readonly ResolvedSemanticEntity[], offset: number) => {
    if (!items.length) return null;
    return (
      <div>
        <div className="sticky top-0 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
          {label}
        </div>
        {items.map((item, index) => {
          const entityId = item.entity.externalId;
          const context = entityContext(item);
          const optionIndex = offset + index;
          return (
            <button
              key={item.entity.canonicalId}
              type="button"
              role="option"
              aria-selected={entityId === value}
              data-active={optionIndex === activeIndex}
              className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent data-[active=true]:bg-accent"
              onMouseEnter={() => setActiveIndex(optionIndex)}
              onClick={() => choose(entityId)}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.displayName}</span>
                <span className="block truncate font-mono text-xs text-muted-foreground">
                  {entityId}
                </span>
                {context ? (
                  <span className="block truncate text-xs text-muted-foreground">{context}</span>
                ) : null}
              </span>
              {entityId === value ? <Check className="mt-1 h-4 w-4 shrink-0" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setQuery('');
        setActiveIndex(0);
      }}
    >
      <div className="relative">
        <Popover.Trigger asChild>
          <button
            id={id}
            type="button"
            aria-label={ariaLabel}
            aria-haspopup="listbox"
            aria-expanded={open}
            className="flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 pr-16 text-left text-sm shadow-sm"
          >
            <span className="min-w-0">
              <span className="block truncate">
                {selectedEntity?.displayName ?? (value || emptyLabel)}
              </span>
              {value ? (
                <span className="block truncate font-mono text-xs text-muted-foreground">
                  {value}
                </span>
              ) : null}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </Popover.Trigger>
        {value ? (
          <button
            type="button"
            aria-label={`${clearLabel}: ${ariaLabel}`}
            className="absolute right-9 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => onChange('')}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <Popover.Portal>
        <Popover.Content
          role="listbox"
          aria-label={ariaLabel}
          sideOffset={4}
          collisionPadding={12}
          className="z-[920] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-md border bg-background shadow-lg"
          onKeyDown={handleKeyDown}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <div className="relative border-b p-2">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {renderGroup(selectedGroupLabel, preferredEntities, 0)}
            {renderGroup(otherGroupLabel, otherEntities, preferredEntities.length)}
            {!visibleEntities.length ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {noResultsLabel}
              </div>
            ) : null}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
