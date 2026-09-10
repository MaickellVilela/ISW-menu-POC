import type { Meta, StoryObj } from '@storybook/vue3';
import JoinVennIcon from '../../components/datasource/JoinVennIcon.vue';

const meta = {
  title: 'Components/JoinVennIcon',
  component: JoinVennIcon,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    type: { control: 'inline-radio', options: ['inner', 'left', 'full'] },
    size: { control: { type: 'range', min: 16, max: 64, step: 2 } },
    color: { control: 'color' },
  },
  args: {
    type: 'inner',
    size: 32,
    color: '#3B1770',
  },
} satisfies Meta<typeof JoinVennIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inner: Story = {
  args: { type: 'inner' },
};

export const Left: Story = {
  args: { type: 'left' },
};

export const Full: Story = {
  args: { type: 'full' },
};

export const Gallery: Story = {
  render: () => ({
    components: { JoinVennIcon },
    template: `
      <div class="flex items-end gap-8 text-center text-xs text-[#6B6B6B]">
        <figure class="space-y-2">
          <JoinVennIcon type="inner" :size="40" />
          <figcaption>inner</figcaption>
        </figure>
        <figure class="space-y-2">
          <JoinVennIcon type="left" :size="40" />
          <figcaption>left</figcaption>
        </figure>
        <figure class="space-y-2">
          <JoinVennIcon type="full" :size="40" />
          <figcaption>full</figcaption>
        </figure>
      </div>
    `,
  }),
};
