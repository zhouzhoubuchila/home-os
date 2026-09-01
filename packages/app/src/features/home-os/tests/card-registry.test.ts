import { describe, expect, it } from 'vitest';
import { createCardTemplates } from '../../dashboard/components/add-card-dialog/templates';
import { HOME_OS_CARD_REGISTRY } from '../cards/card-registry';

describe('Home OS card registry', () => {
  it('exposes every definition through the existing Add Card system', () => {
    const translate = ((key: string) => key) as Parameters<typeof createCardTemplates>[0];
    const templates = createCardTemplates(translate, 'zh');
    for (const definition of HOME_OS_CARD_REGISTRY) {
      expect(templates).toContainEqual(
        expect.objectContaining({
          id: definition.templateId,
          cardType: 'home-os',
          supportedSizes: ['small', 'medium', 'large'],
          initialData: { kind: definition.kind },
        })
      );
    }
  });

  it('keeps registry ids unique', () => {
    const ids = HOME_OS_CARD_REGISTRY.map(({ templateId }) => templateId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
