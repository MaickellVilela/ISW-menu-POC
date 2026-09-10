import type { StorybookConfig } from '@storybook-vue/nuxt';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: '@storybook-vue/nuxt',
  // Storybook boots its own Nuxt instance, so move HMR off Nuxt's default
  // port to allow `npm run dev` and `npm run storybook` side by side.
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    server: {
      ...viteConfig.server,
      hmr: { ...(viteConfig.server?.hmr as object), port: 24679 },
    },
  }),
};

export default config;
