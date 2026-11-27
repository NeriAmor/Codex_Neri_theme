import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9340');
const errors = [];
try {
  const page = browser.contexts()[0].pages().find(page => page.url() === 'app://-/index.html');
  assert.ok(page, 'Actual Codex main window is available');
  const cdp = await page.context().newCDPSession(page);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const trigger = page.getByRole('button', { name: '打开个人资料菜单', exact: true });
  if (await trigger.getAttribute('aria-expanded') === 'true') await page.keyboard.press('Escape');
  for (let attempt = 1; attempt <= 2; attempt++) {
    await trigger.click();
    const menu = page.getByRole('menu').filter({ hasText: '退出登录' });
    await menu.waitFor({ state: 'visible' });
    const provider = menu.locator('[role="menuitem"]').filter({ hasText: /^晚照云$/ });
    assert.equal(await provider.count(), 1, 'Provider label is present for visibility verification');
    await provider.waitFor({ state: 'hidden' });
    for (const name of ['显示智能伙伴', '个人资料', '设置', '退出登录']) {
      assert.equal(await menu.getByRole('menuitem', { name, exact: false }).isVisible(), true, name);
    }
    const bounds = await menu.boundingBox();
    const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { ...bounds, scale: 1 } });
    writeFileSync(new URL(`../artifacts/provider-label-hidden-${attempt}.png`, import.meta.url), Buffer.from(screenshot.data, 'base64'));
    await page.keyboard.press('Escape');
  }
  assert.equal(await page.locator('#codex-prism-stage video').evaluate(video => video.readyState >= 2), true);
  assert.deepEqual(errors, []);
  const report = { menuOpenings: 2, hiddenProviderLabels: 1, otherMenuItemsVisible: true, wallpaperReady: true, errors };
  writeFileSync(new URL('../artifacts/provider-label-report.json', import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
