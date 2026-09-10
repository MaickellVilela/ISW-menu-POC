import { tailwindColors } from './design-system/tokens';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss", '@nuxtjs/storybook'],
  css: ['~/assets/css/tailwind.css'],
  // Keep Storybook opt-in via `npm run storybook` instead of auto-starting with `nuxt dev`.
  storybook: {
    enabled: false,
    port: 6006,
  },
  tailwindcss: {
    config: {
      content: [
        './components/**/*.{js,vue,ts}',
        './layouts/**/*.vue',
        './pages/**/*.vue',
        './plugins/**/*.{js,ts}',
        './app.vue',
        './error.vue',
        './stories/**/*.{js,vue,ts,mdx}',
        '.storybook/**/*.{js,ts}',
        './design-system/**/*.ts',
      ],
      theme: {
        extend: {
          colors: tailwindColors,
        },
      },
    },
  },
})