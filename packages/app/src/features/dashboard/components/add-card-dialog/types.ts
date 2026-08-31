import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import type { CardType } from '@navet/app/features/dashboard/stores/custom-cards-store';
import type { HomeOsCardTemplateId } from '@navet/app/features/home-os/cards/card-registry';
import type { TranslationKey } from '@navet/app/i18n';
import type { ReactNode } from 'react';
import type { DashboardLibraryCard } from '../dashboard-library-list';

export interface AddCardDialogContainerProps {
  open: boolean;
  onClose: () => void;
  onAddCard: (template: CardTemplate, size: CardSize) => void;
  onAddLibraryCard: (cardId: string) => void;
  currentRoom: string;
  libraryCards: DashboardLibraryCard[];
  showCardsTab?: boolean;
  allowedTemplateIds?: CardTemplateId[];
}

export type CardTemplateId = CardType | 'scene' | 'energy-metric' | HomeOsCardTemplateId;

export interface CardTemplate {
  id: CardTemplateId;
  cardType: CardType;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  name?: string;
  description?: string;
  icon: ReactNode;
  defaultSize: CardSize;
  supportedSizes: CardSize[];
  initialData?: Record<string, unknown>;
}

export const cardTemplateName = (
  template: CardTemplate,
  translate: (key: TranslationKey) => string
) => template.name ?? translate(template.nameKey);

export const cardTemplateDescription = (
  template: CardTemplate,
  translate: (key: TranslationKey) => string
) => template.description ?? translate(template.descriptionKey);
