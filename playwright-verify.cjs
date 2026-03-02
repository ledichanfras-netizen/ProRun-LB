const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Start dev server in background
  const { spawn } = require('child_process');
  const server = spawn('npm', ['run', 'dev'], { stdio: 'pipe' });

  let serverReady = false;
  server.stdout.on('data', (data) => {
    if (data.toString().includes('http://localhost:3000')) {
      serverReady = true;
    }
  });

  // Wait for server to be ready
  for (let i = 0; i < 30; i++) {
    if (serverReady) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (!serverReady) {
    console.error('Server timed out');
    server.kill();
    process.exit(1);
  }

  try {
    await page.goto('http://localhost:3000/#/login');
    await page.screenshot({ path: 'login-page.png' });

    // Login as coach
    await page.fill('input[placeholder="Ex: Leandro Barbosa"]', 'leandro');
    await page.fill('input[placeholder="Data de Nascimento (DDMMAAAA)"]', '1234');
    await page.click('button:has-text("ENTRAR NO HUB")');

    await page.waitForURL('**/');
    await page.screenshot({ path: 'dashboard.png' });

    // Go to periodization
    await page.click('a[href="#/periodization"]');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'periodization.png' });

    console.log('Screenshots saved successfully');
  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    server.kill();
    await browser.close();
  }
})();
