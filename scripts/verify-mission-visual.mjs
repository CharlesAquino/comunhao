import { chromium } from '@playwright/test';
const browser = await chromium.launch({headless: true});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
for (const [width,height] of [[360,800],[390,844],[430,932],[768,1024],[1024,768]]) {
  await page.setViewportSize({width,height});
  await page.goto('http://127.0.0.1:5177/mission-preview.html');
  await page.evaluate(() => document.fonts.ready);
  for (const theme of ['dark','light']) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    await page.locator('.mission-week-card__art').evaluateAll(images => Promise.all(images.map(img => img.decode())));
    await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))));
    await page.screenshot({path: `/tmp/mission-${theme}-${width}.png`});
    const button = page.getByRole('button', {name: 'Orar com Sophia'});
    const rect = await button.boundingBox();
    if (!rect || rect.height < 44) throw Error('Alvo de toque insuficiente');
    await button.click();
    await page.getByRole('button', {name: 'Convite enviado'}).waitFor();
    await page.getByRole('button', {name: 'Cancelar'}).click();
    console.log(`${theme} ${width}x${height}: captura, convite e cancelamento OK`);
  }
}
await page.setViewportSize({width:390,height:844});
await page.goto('http://127.0.0.1:5177/mission-preview.html');
await page.evaluate(async () => {
  await document.fonts.ready;
  document.querySelector('.mission-week-card__name').textContent = 'Sophia Maria de Oliveira';
  document.querySelector('.mission-week-card__supporter-identity').textContent = 'Ana Beatriz de Oliveira Santos';
  document.documentElement.style.fontSize = '200%';
});
await page.screenshot({path:'/tmp/mission-text-stress.png'});
console.log('Texto ampliado e nomes longos:', await page.locator('.mission-week-card__message').evaluate(el => ({available:el.clientHeight,content:el.scrollHeight})));
await browser.close();
if (errors.length) throw Error(errors.join('\n'));
