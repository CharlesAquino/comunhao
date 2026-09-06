import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const outputDir = 'audit/identidade-visual-2026-07-26/autenticado';
await mkdir(outputDir, { recursive: true });

const phone = process.env.AUDIT_MEMBER_PHONE;
const password = process.env.AUDIT_MEMBER_PASSWORD;
if (!phone || !password) throw new Error('Defina AUDIT_MEMBER_PHONE e AUDIT_MEMBER_PASSWORD para executar a captura autenticada.');

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
});
const page = await context.newPage();
const events = [];

page.on('console', message => {
  if (message.type() === 'error') events.push({ type: 'console', route: page.url(), text: message.text() });
});
page.on('pageerror', error => events.push({ type: 'pageerror', route: page.url(), text: error.message }));
page.on('response', async response => {
  if (response.status() >= 400) {
    events.push({
      type: 'response',
      route: response.url(),
      text: await response.text().catch(() => ''),
    });
  }
});

await page.addInitScript(() => {
  if (!localStorage.getItem('app-theme')) localStorage.setItem('app-theme', 'dark');
});
await page.goto('http://127.0.0.1:4173/login', { waitUntil: 'domcontentloaded' });
await page.evaluate(async ({ phone, password }) => {
  const { supabase } = await import('/src/services/supabaseClient.ts');
  const { error } = await supabase.auth.signInWithPassword({ phone, password });
  if (error) throw error;
}, { phone, password });
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

const routes = [
  ['home', '/'],
  ['mural', '/mural'],
  ['ebd', '/ebd'],
  ['tesouro', '/loja'],
  ['perfil', '/perfil'],
  ['admin', '/admin'],
];

for (const theme of ['dark', 'light']) {
  if (theme === 'light') {
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const toggleTheme = page.locator('button[aria-label="Ativar tema claro"]');
    await toggleTheme.waitFor({ state: 'visible', timeout: 5000 });
    await toggleTheme.click({ force: true });
    await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light');
  }
  for (const [name, route] of routes) {
    await page.goto(`http://127.0.0.1:4173${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(name === 'home' ? 6000 : 1200);
    await page.screenshot({ path: `${outputDir}/${name}-${theme}.png`, fullPage: true });
    if (name === 'home' && theme === 'dark') {
      const levantarMao = page.getByRole('button', { name: /levantar a mão/i });
      if (await levantarMao.count()) {
        await levantarMao.click();
        const dialog = page.getByRole('dialog', { name: /oração/i });
        try {
          await dialog.waitFor({ state: 'visible', timeout: 5000 });
          await page.screenshot({ path: `${outputDir}/home-oracao-aberta-dark.png`, fullPage: true });
          await dialog.getByRole('button', { name: /amém/i }).click();
          const fechar = dialog.getByRole('button', { name: /fechar/i });
          await fechar.waitFor({ state: 'visible', timeout: 5000 });
          await fechar.click();
        } catch {
          events.push({ type: 'interaction', route: page.url(), text: 'Sala não abriu após Levantar a mão' });
          await page.screenshot({ path: `${outputDir}/home-oracao-erro-dark.png`, fullPage: true });
        }
      }
    }
  }
}

await writeFile(`${outputDir}/resultado.json`, JSON.stringify({
  captures: routes.length * 2,
  viewport: '390x844',
  events,
}, null, 2));
await browser.close();
