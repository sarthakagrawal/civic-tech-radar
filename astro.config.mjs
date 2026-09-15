import { defineConfig } from 'astro/config';
export default defineConfig({site:'https://article.one',base:'/data/civic-tech-radar/',output:'static',build:{inlineStylesheets:'never'},vite:{build:{sourcemap:false,assetsInlineLimit:0}}});
