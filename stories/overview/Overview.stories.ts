import type { Meta, StoryObj } from '@storybook/vue3';
import ComponentGallery from './ComponentGallery.vue';

const meta = {
  title: 'Overview/Component gallery',
  component: ComponentGallery,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof ComponentGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllComponents: Story = {};
