import type { Meta, StoryObj } from '@storybook/vue3';
import TypeScale from './TypeScale.vue';

const meta = {
  title: 'Foundations/Typography',
  component: TypeScale,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof TypeScale>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Scale: Story = {};
