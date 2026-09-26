import { dispatchEntityCommand } from '@navet/app/commands';
import { BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { BookOpen, Clapperboard, House, LogOut, Moon, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ResolvedSemanticEntity } from '../../core/types';
import { buildSceneCoreModel, type SceneCoreSize, sceneCoreIconKind } from './scene-core-model';
import { useLunarLifeMotion } from './use-lunar-life-motion';
import './lunar-life-cards.css';

const sceneIcons = {
  sleep: Moon,
  away: LogOut,
  movie: Clapperboard,
  reading: BookOpen,
  home: House,
  other: Sparkles,
};

function visualSize(size: CardSize): SceneCoreSize {
  if (size === 'small' || size === 'tiny' || size === 'extra-small') return 'small';
  if (size === 'medium' || size === 'medium-vertical') return 'medium';
  return 'large';
}

export function SceneCoreHomeOsCard({
  size,
  entities,
  isEditMode,
  language,
  title,
  storyFeedback,
}: {
  size: CardSize;
  entities: readonly ResolvedSemanticEntity[];
  isEditMode: boolean;
  language: string;
  title: string;
  storyFeedback?: 'success' | 'error';
}) {
  const kind = visualSize(size);
  const model = buildSceneCoreModel(entities, kind);
  const motion = useLunarLifeMotion();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    id: string;
    state: 'success' | 'error';
    key: number;
  } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequence = useRef(0);

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    []
  );

  const trigger = async (scene: ResolvedSemanticEntity) => {
    if (isEditMode || pendingId || scene.controlPolicy === 'readonly') return;
    const id = scene.entity.canonicalId;
    setPendingId(id);
    setFeedback(null);
    try {
      const result = await dispatchEntityCommand(
        { type: 'turn_on', entityId: scene.entity.externalId },
        scene.entity.providerId
      );
      if (!result.accepted) throw new Error(result.error ?? 'Scene command rejected');
      setFeedback({ id, state: 'success', key: ++sequence.current });
    } catch {
      setFeedback({ id, state: 'error', key: ++sequence.current });
      toast.error(
        language === 'zh'
          ? `无法执行“${scene.displayName}”`
          : `Failed to activate “${scene.displayName}”`
      );
    } finally {
      setPendingId(null);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => setFeedback(null), 2400);
    }
  };

  return (
    <BaseCard
      size={size}
      title={title}
      subtitle="SCENE / CORE"
      headerLayout="eyebrow-first"
      headerLeading={<Sparkles className="h-4 w-4" />}
      themeOverride="dark"
      frameClassName="scene-core-card"
      disableDefaultSheen
      data-scene-motion={motion}
      data-scene-size={kind}
      data-scene-feedback={feedback?.state ?? storyFeedback ?? 'idle'}
      data-scene-pending={pendingId ? 'true' : 'false'}
    >
      <div className="scene-core-body">
        <div className="scene-core-visual" aria-hidden="true">
          <div className="scene-core-ring scene-core-ring-outer" />
          <div className="scene-core-ring scene-core-ring-inner" />
          <div className="scene-core-center">
            <Sparkles className="h-5 w-5" />
          </div>
          {model.scenes.slice(0, 4).map((scene, index) => (
            <span
              key={scene.entity.canonicalId}
              className={`scene-core-node scene-core-node-${index}`}
            />
          ))}
          {feedback || storyFeedback ? (
            <span
              key={feedback?.key ?? 'story'}
              className={`scene-core-pulse scene-core-pulse-${feedback?.state ?? storyFeedback}`}
            />
          ) : null}
        </div>
        <div className="scene-core-scenes">
          {model.scenes.map((scene) => {
            const Icon = sceneIcons[sceneCoreIconKind(scene.displayName)];
            const id = scene.entity.canonicalId;
            return (
              <button
                key={id}
                type="button"
                className="scene-core-action"
                disabled={isEditMode || Boolean(pendingId) || scene.controlPolicy === 'readonly'}
                aria-busy={pendingId === id}
                data-scene-action-state={
                  pendingId === id ? 'activating' : feedback?.id === id ? feedback.state : 'ready'
                }
                onClick={() => void trigger(scene)}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{scene.displayName}</span>
                {pendingId === id ? (
                  <span className="sr-only">{language === 'zh' ? '执行中' : 'Activating'}</span>
                ) : null}
              </button>
            );
          })}
          {model.remaining > 0 ? <span className="scene-core-more">+{model.remaining}</span> : null}
          {model.total === 0 ? (
            <div className="scene-core-empty">
              <strong>{language === 'zh' ? '暂无家庭模式' : 'No home scenes'}</strong>
              <span>
                {language === 'zh'
                  ? '可在 Home Assistant 中添加 Scene'
                  : 'Add a scene in Home Assistant'}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </BaseCard>
  );
}
