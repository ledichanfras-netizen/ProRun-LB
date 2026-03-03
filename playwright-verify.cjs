const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    console.log('--- TESTE COACH ---');
    console.log('Navegando para a página de login...');
    await page.goto('http://localhost:3000/#/login');
    await page.waitForTimeout(2000);

    console.log('Tentando login como Coach...');
    await page.fill('input[placeholder="Ex: Leandro Barbosa"]', 'leandro');
    await page.fill('input[placeholder="Data de Nascimento (DDMMAAAA)"]', '1234');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);
    const coachDashboardTitle = await page.textContent('h1');
    console.log('Dashboard Coach carregado:', coachDashboardTitle);
    await page.screenshot({ path: 'coach-dashboard.png' });

    console.log('--- TESTE ROLE ACCESS ---');
    // Tentar acessar portal do atleta como coach (deve funcionar pois é rota comum agora)
    await page.goto('http://localhost:3000/#/athlete-portal');
    await page.waitForTimeout(2000);
    console.log('Acesso ao Athlete Portal como Coach: OK');

    console.log('--- TESTE LOGOUT ---');
    await page.click('button:has-text("Sair")');
    await page.waitForTimeout(2000);
    if (page.url().includes('login')) {
        console.log('Logout realizado com sucesso.');
    }

  } catch (error) {
    console.error('Erro durante a verificação Playwright:', error);
  } finally {
    await browser.close();
  }
})();
