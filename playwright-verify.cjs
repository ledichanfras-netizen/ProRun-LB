const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    console.log('Navegando para a página de login...');
    await page.goto('http://localhost:3000/#/login');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'login-page.png' });

    console.log('Tentando login como Coach...');
    await page.fill('input[placeholder="Ex: Leandro Barbosa"]', 'leandro');
    await page.fill('input[placeholder="Data de Nascimento (DDMMAAAA)"]', '1234');
    await page.click('button[type="submit"]');

    // Aguardar transição (Dashboard)
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'coach-dashboard.png' });

    console.log('Verificando sidebar...');
    const sidebar = await page.locator('aside');
    await sidebar.screenshot({ path: 'sidebar-status.png' });

  } catch (error) {
    console.error('Erro durante a verificação Playwright:', error);
  } finally {
    await browser.close();
  }
})();
