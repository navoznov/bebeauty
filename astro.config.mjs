import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://navoznov.github.io',
  base: '/bebeauty',
  trailingSlash: 'always',
  i18n: {
    locales: ['ru', 'en'],
    defaultLocale: 'ru',
    routing: { prefixDefaultLocale: false },
  },
});
