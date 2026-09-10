# Data Source Creation POC

Nuxt 3 prototype for building data sources with visual joins. This repo also includes a **code-first design-system starter** in Storybook — tokens and component stories live next to the product, without a Figma file.

## App

```bash
npm install
npm run dev
```

## Storybook (design system)

```bash
npm run storybook
```

Open [http://localhost:6006](http://localhost:6006).

Suggested walkthrough:

1. **Overview → Component gallery** — every documented component on one page.
2. **Foundations → Colors** — palette extracted from the live UI, with WCAG AA contrast against white.
3. **Foundations → Typography / Spacing** — type and spacing already used in the app.
4. **Components → Button / ToggleSwitch / FieldSelect** — Controls panel for props; **Accessibility** panel for automated checks.
5. **Components → Button → Fails contrast (demo)** — an intentional WCAG failure to show the a11y addon catching it.

Storybook is opt-in (`npm run storybook`). It does not start with `npm run dev`.

Static export (optional):

```bash
npm run build-storybook
```
