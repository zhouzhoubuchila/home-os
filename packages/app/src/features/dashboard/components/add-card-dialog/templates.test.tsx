import { zhMessages } from '@navet/app/i18n/messages/zh';
import { describe, expect, it } from 'vitest';
import { createCardTemplates } from './templates';
import { cardTemplateName } from './types';

describe('createCardTemplates media stack', () => {
  it('registers the medium media-stack card with supported sizes and Chinese name', () => {
    const template = createCardTemplates((key) => key, 'zh').find(
      (entry) => entry.id === 'media-stack'
    );
    if (!template) throw new Error('media-stack template is missing');

    expect(template).toEqual(
      expect.objectContaining({
        id: 'media-stack',
        cardType: 'media-stack',
        defaultSize: 'medium',
        supportedSizes: ['small', 'medium', 'large'],
        nameKey: 'dashboard.addCard.templates.mediaStack.name',
        descriptionKey: 'dashboard.addCard.templates.mediaStack.description',
      })
    );
    expect(template.initialData).toBeUndefined();
    expect(cardTemplateName(template, (key) => zhMessages[key])).toBe('媒体堆栈');
  });
});
