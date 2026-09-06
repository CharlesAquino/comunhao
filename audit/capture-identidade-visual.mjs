import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const outputDir = 'audit/identidade-visual-2026-07-26';
const uiTestPassword = process.env.AUDIT_UI_PASSWORD ?? 'ui-test-placeholder';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox'],
});

const events = [];

for (const theme of ['dark', 'light']) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') events.push({ theme, type: 'console', text: message.text() });
  });
  page.on('pageerror', (error) => events.push({ theme, type: 'pageerror', text: error.message }));

  await page.addInitScript((selectedTheme) => {
    localStorage.setItem('app-theme', selectedTheme);
  }, theme);
  await page.goto('http://127.0.0.1:4173/login', { waitUntil: 'networkidle' });

  const password = page.locator('#login-senha');
  await password.fill(uiTestPassword);
  await page.getByRole('button', { name: 'Mostrar senha' }).click();
  const passwordVisible = await password.getAttribute('type') === 'text';
  await page.getByRole('button', { name: 'Ocultar senha' }).click();

  const submit = page.getByRole('button', { name: /Entrar/ });
  await submit.focus();
  await page.screenshot({ path: `${outputDir}/login-${theme}.png`, fullPage: true });

  const themeApplied = await page.locator('html').getAttribute('data-theme');
  const submitBox = await submit.boundingBox();
  events.push({
    theme,
    type: 'assertions',
    themeApplied,
    passwordVisible,
    submitHeight: submitBox?.height ?? null,
  });
  await context.close();
}

await writeFile(`${outputDir}/resultado.json`, JSON.stringify(events, null, 2));
await browser.close();
