import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Acesso público', () => {
  test('a tela de entrada preserva navegação, rótulos e acessibilidade básica', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Comunhão' })).toBeVisible();
    await expect(page.getByLabel('Usuário')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Senha' })).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('a recuperação e o cadastro são alcançáveis sem iniciar sessão', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: /esqueceu a senha/i }).click();
    await expect(page).toHaveURL(/\/recuperar-senha$/);

    await page.goto('/login');
    await page.getByRole('link', { name: /crie sua conta/i }).click();
    await expect(page).toHaveURL(/\/register$/);
  });
});
