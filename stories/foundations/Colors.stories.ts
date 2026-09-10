import type { Meta, StoryObj } from '@storybook/vue3';
import ColorPalette from './ColorPalette.vue';

const meta = {
  title: 'Foundations/Colors',
  component: ColorPalette,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof ColorPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Palette: Story = {};
