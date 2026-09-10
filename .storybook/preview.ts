import type { Preview } from '@storybook-vue/nuxt';
import '~/assets/css/tailwind.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: ['Foundations', 'Components'],
      },
    },
    a11y: {
      test: 'todo',
    },
  },
};

export default preview;
