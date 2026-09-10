import type { Meta, StoryObj } from '@storybook/vue3';
import SpacingScale from './SpacingScale.vue';

const meta = {
  title: 'Foundations/Spacing',
  component: SpacingScale,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof SpacingScale>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Scale: Story = {};
