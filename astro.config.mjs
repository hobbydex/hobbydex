import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://hobbydex.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
