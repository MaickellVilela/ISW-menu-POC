import type { Meta, StoryObj } from '@storybook/vue3';
import HistoryDisclosure from '../../components/workspace/HistoryDisclosure.vue';

const meta = {
  title: 'Components/HistoryDisclosure',
  component: HistoryDisclosure,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    title: { control: 'text' },
    meta: { control: 'text' },
    defaultOpen: { control: 'boolean' },
    forceOpen: { control: 'boolean' },
  },
  args: {
    title: 'Joined Transactions → Locations',
    meta: '2 min ago',
    defaultOpen: false,
    forceOpen: null,
  },
  decorators: [
    () => ({
      template: '<div class="w-[360px]"><story /></div>',
    }),
  ],
  render: (args) => ({
    components: { HistoryDisclosure },
    setup() {
      return { args };
    },
    template: `
      <HistoryDisclosure v-bind="args">
        <p class="text-[13px] text-[#6B6B6B]">
          Matched on <code>location_id</code>. 1,248 rows in the preview.
        </p>
      </HistoryDisclosure>
    `,
  }),
} satisfies Meta<typeof HistoryDisclosure>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {};

export const Open: Story = {
  args: { defaultOpen: true },
};

export const ForcedOpen: Story = {
  args: { forceOpen: true, meta: 'Running…' },
};
