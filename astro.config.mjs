// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Change this if the Cloudflare Pages project gets a different name, or once there's a custom domain.
  site: 'https://pregraph.pages.dev',
  integrations: [react(), sitemap({ filter: (page) => !page.endsWith('/404/') })],
});
