import type { Meta, StoryObj } from '@storybook/vue3';
import FieldSelect from '../../components/datasource/FieldSelect.vue';
import type { FieldOption } from '../../composables/useDataSourceCanvas';

const fieldOptions: FieldOption[] = [
  { value: 'Transactions.location_id', name: 'location_id', type: 'number', entity: 'Transactions' },
  { value: 'Transactions.amount', name: 'amount', type: 'currency', entity: 'Transactions' },
  { value: 'Transactions.posted_at', name: 'posted_at', type: 'datetime', entity: 'Transactions' },
  { value: 'Locations.name', name: 'name', type: 'string', entity: 'Locations' },
  { value: 'Locations.region', name: 'region', type: 'string', entity: 'Locations' },
];

const meta = {
  title: 'Components/FieldSelect',
  component: FieldSelect,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    modelValue: { control: 'text' },
    placeholder: { control: 'text' },
    accent: { control: 'color' },
  },
  args: {
    modelValue: '',
    options: fieldOptions,
    placeholder: 'Select field',
    accent: '#3B6BB5',
  },
  decorators: [
    () => ({
      template: '<div class="h-72 w-56"><story /></div>',
    }),
  ],
  render: (args) => ({
    components: { FieldSelect },
    setup() {
      return { args };
    },
    template: `
      <FieldSelect
        v-bind="args"
        @update:modelValue="args.modelValue = $event"
      />
    `,
  }),
} satisfies Meta<typeof FieldSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Selected: Story = {
  args: { modelValue: 'Transactions.amount' },
};

export const PurpleAccent: Story = {
  args: {
    modelValue: 'Locations.name',
    accent: '#3B1770',
  },
};
