import type { Meta, StoryObj } from '@storybook/vue3';
import Button from '../../components/Button.vue';

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Primary and secondary actions as used on login, dialogs, and save flows. Built from the live UI (brand fill, focus ring, disabled opacity) so the design system can start from code.',
      },
    },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary'] },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    disabled: { control: 'boolean' },
    type: { control: 'inline-radio', options: ['button', 'submit'] },
    label: { control: 'text', description: 'Button text (default slot)' },
  },
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
    type: 'button',
    label: 'Save data source',
  },
  render: (args) => ({
    components: { Button },
    setup() {
      return { args };
    },
    template: `
      <Button
        :variant="args.variant"
        :size="args.size"
        :disabled="args.disabled"
        :type="args.type"
        :aria-label="args.ariaLabel"
      >{{ args.label }}</Button>
    `,
  }),
} satisfies Meta<typeof Button> & { args: { label: string } };

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: { variant: 'secondary', label: 'Cancel' },
};

export const Small: Story = {
  args: { size: 'sm', label: 'Apply' },
};

export const Disabled: Story = {
  args: { disabled: true, label: 'Save data source' },
};

/** Intentional WCAG failure so the Accessibility addon has a clear demo case. */
export const FailsContrast: Story = {
  name: 'Fails contrast (demo)',
  args: { label: 'Save' },
  parameters: {
    docs: {
      description: {
        story:
          'Wrong token pairing on purpose: `subtle` (#9A9A9A) on white is about 2.8:1, below the 4.5:1 AA bar. Open the **Accessibility** panel to see the addon flag it.',
      },
    },
  },
  render: (args) => ({
    components: { Button },
    setup() {
      return { args };
    },
    template: `
      <Button
        variant="secondary"
        :style="{ color: '#9A9A9A', backgroundColor: '#FFFFFF' }"
      >{{ args.label }}</Button>
    `,
  }),
};
