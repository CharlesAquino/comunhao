import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 420, height: 1500 });
await page.goto('http://127.0.0.1:5177/mission-preview.html');
await page.evaluate(() => document.fonts.ready);

// Dark theme
await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/cards-compare-dark.png', fullPage: true });

// Light theme
await page.evaluate(() => document.documentElement.dataset.theme = 'light');
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/cards-compare-light.png', fullPage: true });

console.log('Screenshots captured: /tmp/cards-compare-dark.png and /tmp/cards-compare-light.png');
await browser.close();
