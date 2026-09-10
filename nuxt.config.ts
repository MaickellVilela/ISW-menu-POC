import { tailwindColors } from './design-system/tokens';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss"],
  css: ['~/assets/css/tailwind.css'],
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