import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = 'http://127.0.0.1:5173';
const outputDir = 'audit/evidencias-2026-07-26';
const memberPhone = process.env.AUDIT_MEMBER_PHONE;
const memberPassword = process.env.AUDIT_MEMBER_PASSWORD;
const adminPhone = process.env.AUDIT_ADMIN_PHONE;
const adminPassword = process.env.AUDIT_ADMIN_PASSWORD;
if (!memberPhone || !memberPassword || !adminPhone || !adminPassword) {
  throw new Error('Defina AUDIT_MEMBER_PHONE, AUDIT_MEMBER_PASSWORD, AUDIT_ADMIN_PHONE e AUDIT_ADMIN_PASSWORD para executar a auditoria autenticada.');
}
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
});
const page = await context.newPage();
const events = [];
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') {
    events.push({ kind: `console:${message.type()}`, text: message.text(), url: page.url() });
  }
});
page.on('pageerror', (error) => events.push({ kind: 'pageerror', text: error.message, url: page.url() }));
page.on('requestfailed', (request) => events.push({
  kind: 'requestfailed',
  text: `${request.method()} ${request.url()} — ${request.failure()?.errorText}`,
  url: page.url(),
}));
page.on('response', (response) => {
  if (response.status() >= 400) {
    events.push({ kind: 'response', text: `${response.status()} ${response.url()}`, url: page.url() });
  }
});

await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${outputDir}/01-login.png`, fullPage: true });
const loginText = await page.locator('body').innerText();
await writeFile(`${outputDir}/01-login.txt`, loginText);

const phoneInput = page.getByPlaceholder(/27999998888/i);
await phoneInput.click();
await phoneInput.pressSequentially(memberPhone, { delay: 40 });
await page.getByPlaceholder(/sua senha/i).fill(memberPassword);
events.push({ kind: 'input', text: `telefone=${await phoneInput.inputValue()}`, url: page.url() });
await page.screenshot({ path: `${outputDir}/02-login-preenchido.png`, fullPage: true });
await page.getByRole('button', { name: /entrar/i }).click();
await page.waitForTimeout(15000);
await page.screenshot({ path: `${outputDir}/03-pos-login.png`, fullPage: true });

if (page.url().includes('/verificar-dispositivo')) {
  await page.getByRole('button', { name: /pular verificação/i }).click();
  await page.waitForTimeout(3000);
}

const routes = [
  ['04-home', '/'],
  ['05-mural', '/mural'],
  ['06-ranking', '/ranking'],
  ['07-ebd', '/ebd'],
  ['08-loja', '/loja'],
  ['09-carteira', '/carteira'],
  ['10-comunidade', '/comunidade'],
  ['11-perfil', '/perfil'],
  ['12-guia', '/guia'],
  ['13-admin-membro', '/admin'],
];
const routeResults = [];
for (const [name, route] of routes) {
  await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${outputDir}/${name}.png`, fullPage: true });
  routeResults.push({
    name,
    route,
    finalUrl: page.url(),
    body: await page.locator('body').innerText(),
  });
}

const interactionResults = [];

await page.goto(`${baseURL}/mural`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.getByRole('button', { name: /criar pedido de oração/i }).click();
await page.screenshot({ path: `${outputDir}/14-mural-modal-criar.png`, fullPage: true });
await page.getByLabel(/pedido ou testemunho/i).fill('[AUDITORIA 2026-07-26] Pedido temporário de teste');
await page.getByRole('button', { name: /^publicar$/i }).click();
await page.waitForTimeout(3000);
await page.screenshot({ path: `${outputDir}/15-mural-publicacao-resultado.png`, fullPage: true });
interactionResults.push({
  name: 'criar-pedido',
  body: await page.locator('body').innerText(),
});
const cancelarModal = page.getByRole('button', { name: /^cancelar$/i });
if (await cancelarModal.count()) {
  await cancelarModal.click();
  await page.waitForTimeout(300);
}

const interceder = page.getByRole('button', { name: /^interceder$/i }).first();
if (await interceder.count()) {
  await interceder.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${outputDir}/16-mural-interceder-resultado.png`, fullPage: true });
  interactionResults.push({
    name: 'interceder',
    body: await page.locator('body').innerText(),
  });
}

await page.goto(`${baseURL}/loja`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.getByRole('button', { name: /meus pedidos/i }).click();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${outputDir}/17-loja-meus-pedidos.png`, fullPage: true });
interactionResults.push({
  name: 'loja-meus-pedidos',
  body: await page.locator('body').innerText(),
});

await page.goto(`${baseURL}/register`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${outputDir}/18-cadastro.png`, fullPage: true });
interactionResults.push({
  name: 'cadastro',
  body: await page.locator('body').innerText(),
});

for (const [name, route] of [
  ['19-chat-id-invalido', '/chat/00000000-0000-0000-0000-000000000000'],
  ['20-sala-id-invalido', '/sala/00000000-0000-0000-0000-000000000000'],
  ['21-timer-id-invalido', '/timer/00000000-0000-0000-0000-000000000000'],
]) {
  await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${outputDir}/${name}.png`, fullPage: true });
  interactionResults.push({ name, body: await page.locator('body').innerText(), finalUrl: page.url() });
}

const adminContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
});
const adminPage = await adminContext.newPage();
adminPage.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') {
    events.push({ kind: `admin-console:${message.type()}`, text: message.text(), url: adminPage.url() });
  }
});
adminPage.on('response', (response) => {
  if (response.status() >= 400) {
    events.push({ kind: 'admin-response', text: `${response.status()} ${response.url()}`, url: adminPage.url() });
  }
});
await adminPage.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
const adminPhoneInput = adminPage.getByPlaceholder(/27999998888/i);
await adminPhoneInput.click();
await adminPhoneInput.pressSequentially(adminPhone, { delay: 30 });
await adminPage.getByPlaceholder(/sua senha/i).fill(adminPassword);
await adminPage.getByRole('button', { name: /^entrar$/i }).click();
await adminPage.waitForTimeout(15000);
if (adminPage.url().includes('/verificar-dispositivo')) {
  await adminPage.getByRole('button', { name: /pular verificação/i }).click();
  await adminPage.waitForTimeout(3000);
}
await adminPage.goto(`${baseURL}/admin`, { waitUntil: 'domcontentloaded' });
await adminPage.waitForTimeout(4000);
await adminPage.screenshot({ path: `${outputDir}/22-admin-charles.png`, fullPage: true });
interactionResults.push({
  name: 'admin-charles',
  body: await adminPage.locator('body').innerText(),
  finalUrl: adminPage.url(),
});
await adminContext.close();

await writeFile(`${outputDir}/eventos.json`, JSON.stringify(events, null, 2));
await writeFile(`${outputDir}/resultado-inicial.json`, JSON.stringify({
  finalUrl: page.url(),
  title: await page.title(),
  body: await page.locator('body').innerText(),
  routes: routeResults,
  interactions: interactionResults,
}, null, 2));
await browser.close();
