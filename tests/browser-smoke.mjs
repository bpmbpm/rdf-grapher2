import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const server = spawn('python3', ['-m', 'http.server', '8000'], { stdio: 'ignore' });
await new Promise(resolve => setTimeout(resolve, 500));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('console', message => {
  if (message.type() === 'error' && !message.text().includes('status of 404')) errors.push(message.text());
});
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) {
    errors.push(`${response.status()} ${response.url()}`);
  }
});

try {
  await page.goto('http://127.0.0.1:8000/ver1/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.RdfGrapher?.workflow?.visualize);
  await page.locator('.example-link', { hasText: 'Turtle' }).first().click();
  await page.getByRole('button', { name: 'Визуализировать', exact: true }).click();
  await page.locator('#output svg').waitFor({ state: 'visible' });
  const logText = await page.locator('#execution-log').innerText();
  if (!logText.includes('[initialization] main: успех')) throw new Error('main() не записан в журнал');
  if (!logText.includes('[workflow] visualize: успех')) throw new Error('visualize() не записан в журнал');
  if (errors.length) throw new Error(`Ошибки браузера:\n${errors.join('\n')}`);
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/ver1-typescript.png', fullPage: true });
} finally {
  await browser.close();
  server.kill();
}
