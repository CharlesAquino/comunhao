import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--allow-file-access-from-files'],
});
const page = await browser.newPage({
  viewport: { width: 1800, height: 1200 },
  deviceScaleFactor: 1,
});
const comparison = resolve('audit/identidade-visual-2026-07-26/comparacao.html');
await page.goto(pathToFileURL(comparison).href, { waitUntil: 'load' });
await page.screenshot({
  path: 'audit/identidade-visual-2026-07-26/comparacao-conjunta.png',
  fullPage: true,
});
await browser.close();
