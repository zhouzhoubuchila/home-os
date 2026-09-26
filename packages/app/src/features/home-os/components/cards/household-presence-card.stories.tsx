import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { useI18n } from '@navet/app/hooks';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { FamilyMember } from '../../adapters/family-adapter';
import { HouseholdPresenceCard } from './household-presence-card';

type Scenario = 'home' | 'away' | 'unknown' | 'empty';

function Preview({
  size,
  scenario,
  multiple,
}: {
  size: CardSize;
  scenario: Scenario;
  multiple: boolean;
}) {
  const { t } = useI18n();
  const members: FamilyMember[] =
    scenario === 'empty'
      ? []
      : [
          {
            id: 'lili',
            name: '粒粒',
            personEntityId: 'person.li_li',
            trackerEntityIds: ['device_tracker.li_li_lily'],
            state: scenario === 'away' ? 'not_home' : scenario,
            trackerSources: [],
          },
          ...(multiple
            ? [
                {
                  id: 'alex',
                  name: 'Alex',
                  personEntityId: 'person.alex',
                  trackerEntityIds: [],
                  state: 'home',
                  trackerSources: [],
                },
                {
                  id: 'sam',
                  name: 'Sam',
                  personEntityId: 'person.sam',
                  trackerEntityIds: [],
                  state: 'not_home',
                  trackerSources: [],
                },
              ]
            : []),
        ];
  return (
    <EntityCardStoryFrame size={size}>
      <HouseholdPresenceCard size={size} members={members} title="家庭状态" status="在家" t={t} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Home OS/Lunar Presence',
  component: Preview,
  args: { size: 'medium', scenario: 'home', multiple: false },
  argTypes: {
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
    scenario: { control: 'inline-radio', options: ['home', 'away', 'unknown', 'empty'] },
  },
} satisfies Meta<typeof Preview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MediumHomeAnimated: Story = {};
export const MediumAway: Story = { args: { scenario: 'away' } };
export const MediumUnknown: Story = { args: { scenario: 'unknown' } };
export const MultipleMembersHome: Story = { args: { multiple: true } };
export const MediumEmpty: Story = { args: { scenario: 'empty' } };
