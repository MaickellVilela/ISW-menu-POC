import type { Meta, StoryObj } from '@storybook/vue3';
import ToggleSwitch from '../../components/datasource/ToggleSwitch.vue';

const meta = {
  title: 'Components/ToggleSwitch',
  component: ToggleSwitch,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    modelValue: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
  },
  args: {
    modelValue: false,
    disabled: false,
    label: 'Enable scheduled refresh',
    size: 'md',
  },
  render: (args) => ({
    components: { ToggleSwitch },
    setup() {
      return { args };
    },
    template: `
      <ToggleSwitch
        v-bind="args"
        @update:modelValue="args.modelValue = $event"
      />
    `,
  }),
} satisfies Meta<typeof ToggleSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = {
  args: { modelValue: true },
};

export const Disabled: Story = {
  args: { modelValue: true, disabled: true },
};

export const Small: Story = {
  args: { size: 'sm', modelValue: true },
};
