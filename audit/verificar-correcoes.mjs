import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = 'http://127.0.0.1:5173';
const outputDir = 'audit/evidencias-pos-correcao-2026-07-26';
const invalidId = '00000000-0000-0000-0000-000000000000';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'pt-BR' });
const results = [];

await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
results.push({
  fluxo: 'login-acessivel',
  telefoneNomeado: await page.getByLabel('WhatsApp').count() === 1,
  senhaNomeada: await page.getByLabel('Senha', { exact: true }).count() === 1,
  mostrarSenhaNomeado: await page.getByRole('button', { name: 'Mostrar senha' }).count() === 1,
});
await page.screenshot({ path: `${outputDir}/01-login-acessivel.png`, fullPage: true });

await page.goto(`${baseURL}/timer/${invalidId}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const timerBody = await page.locator('body').innerText();
results.push({
  fluxo: 'timer-invalido',
  bloqueado: timerBody.includes('Sessão indisponível'),
  cronometroIniciado: timerBody.includes('Em Oração Silenciosa'),
  botaoAmem: await page.getByRole('button', { name: 'Amém' }).count(),
});
await page.screenshot({ path: `${outputDir}/02-timer-invalido-bloqueado.png`, fullPage: true });

await page.goto(`${baseURL}/chat/${invalidId}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const chatBody = await page.locator('body').innerText();
results.push({
  fluxo: 'chat-invalido',
  erroVisivel: chatBody.includes('perfil não está vinculado') || chatBody.includes('membro não foi encontrado'),
  estadoVazioIncorreto: chatBody.includes('Nenhuma mensagem ainda'),
});
await page.screenshot({ path: `${outputDir}/03-chat-invalido.png`, fullPage: true });

await writeFile(`${outputDir}/resultado.json`, JSON.stringify(results, null, 2));
await browser.close();
