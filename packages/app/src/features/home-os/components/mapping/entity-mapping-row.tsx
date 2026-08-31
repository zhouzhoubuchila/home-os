import { Button } from '@navet/app/components/primitives';
import { cn } from '@navet/app/components/ui/utils';
import type { SettingsSectionStyles } from '@navet/app/features/settings/hooks/settings-section-styles';
import { useI18n } from '@navet/app/hooks';
import type { ResolvedSemanticEntity } from '../../core/types';
import { getHomeOsCopy } from '../../i18n/home-os-copy';

interface EntityMappingRowProps {
  resolved: ResolvedSemanticEntity;
  styles: SettingsSectionStyles;
  saving: boolean;
  onEdit: () => void;
  onIgnore: () => void;
  onRestoreAuto: () => void;
}

export function EntityMappingRow({
  resolved,
  styles,
  saving,
  onEdit,
  onIgnore,
  onRestoreAuto,
}: EntityMappingRowProps) {
  const { language } = useI18n();
  const copy = getHomeOsCopy(language);
  const autoRole = resolved.candidates[0]?.role ?? 'unmapped';
  const finalRole = resolved.ignored ? 'ignored' : (resolved.roles[0] ?? 'unmapped');
  return (
    <article className={cn('grid gap-3 px-4 py-4 md:px-5', styles.hoverBg)}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn('truncate text-sm font-semibold', styles.textColor)}>
            {resolved.displayName}
          </h3>
          <p className={cn('truncate text-xs', styles.subtleColor)}>{resolved.entity.externalId}</p>
        </div>
        <span
          className={cn(
            'rounded-full border px-2 py-1 text-xs font-medium',
            styles.insetBorderColor,
            resolved.needsReview ? 'text-amber-500' : styles.subtleColor
          )}
        >
          {resolved.needsReview ? copy.needsReview : resolved.source}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4 lg:grid-cols-6">
        <div>
          <dt className={styles.subtleColor}>{copy.domain}</dt>
          <dd className={styles.textColor}>{resolved.entity.externalId.split('.')[0]}</dd>
        </div>
        <div>
          <dt className={styles.subtleColor}>{copy.room}</dt>
          <dd className={styles.textColor}>{resolved.room || '—'}</dd>
        </div>
        <div>
          <dt className={styles.subtleColor}>{copy.autoRole}</dt>
          <dd className="truncate font-mono">{autoRole}</dd>
        </div>
        <div>
          <dt className={styles.subtleColor}>{copy.confidence}</dt>
          <dd className={styles.textColor}>{Math.round(resolved.confidence * 100)}%</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className={styles.subtleColor}>{copy.finalRole}</dt>
          <dd className="truncate font-mono">{finalRole}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button size="small" variant="secondary" onClick={onEdit} disabled={saving}>
          {copy.edit}
        </Button>
        <Button size="small" variant="ghost" onClick={onIgnore} disabled={saving}>
          {copy.ignore}
        </Button>
        {resolved.mapping ? (
          <Button size="small" variant="ghost" onClick={onRestoreAuto} disabled={saving}>
            {copy.restoreAuto}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
