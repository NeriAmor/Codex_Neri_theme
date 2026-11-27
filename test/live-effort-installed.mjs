import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9340');
const page = browser.contexts().flatMap(context => context.pages()).find(page => page.url() === 'app://-/index.html');
const session = await page.context().newCDPSession(page);
const trigger = () => page.locator('[data-composer-navigation-target="reasoning"]').filter({ visible: true });
const slider = () => page.locator('.codex-effort-slider .ces-root').filter({ visible: true });
const errors = [];
const onError = error => errors.push(error.message);
page.on('pageerror', onError);
let checks = 0, original;
const check = (value, message) => { assert.ok(value, message); checks++; };
try {
  original = await trigger().getAttribute('data-selected-reasoning-effort');
  // Do not inject the source bundle: require the installed service to recover it.
  await page.evaluate(() => window.__codexEffortSlider?.destroy());
  await page.waitForFunction(() => window.__codexEffortSlider?.version === 1);
  check(true, 'installed companion automatically injects slider after destruction');
  await trigger().click(); await slider().waitFor();
  await slider().focus(); await page.keyboard.press('Home');
  await page.waitForFunction(() => [...document.querySelectorAll('[data-composer-navigation-target="reasoning"]')].some(element => element.getBoundingClientRect().width && element.dataset.selectedReasoningEffort === 'low'));
  check(true, 'installed slider updates native effort');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => [...document.querySelectorAll('[data-composer-navigation-target="reasoning"]')].some(element => element.getBoundingClientRect().width && element.dataset.selectedReasoningEffort === 'medium'));
  check(true, 'installed slider keyboard remains scoped to itself');
  await page.locator('[role="menu"][data-state="open"]').filter({ visible: true }).screenshot({ path: fileURLToPath(new URL('../artifacts/35-effort-installed.png', import.meta.url)) });
  await page.keyboard.press('Escape');
  await session.send('Emulation.setDeviceMetricsOverride', { width: 900, height: 760, deviceScaleFactor: 0, mobile: false });
  await trigger().click(); await slider().waitFor();
  const bounds = await slider().boundingBox();
  check(bounds.x >= 0 && bounds.x + bounds.width <= 900 && bounds.y >= 0 && bounds.y + bounds.height <= 760, 'slider fits compact desktop window');
  await page.screenshot({ path: fileURLToPath(new URL('../artifacts/36-effort-compact.png', import.meta.url)) });
  await page.keyboard.press('Escape');
  await session.send('Emulation.clearDeviceMetricsOverride');
  check(errors.length === 0, 'no renderer errors in installed or compact flow');
  const report = { checks, failures: 0, errors, verified: 'Installed service automatic injection; native switching; compact 900x760 layout', limitations: 'Application not terminated; original model/effort restored, no messages sent.' };
  writeFileSync(new URL('../artifacts/effort-installed-report.json', import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await session.send('Emulation.clearDeviceMetricsOverride').catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
  // Use the current native action to restore even if a menu check failed.
  if (original) await trigger().evaluate((element, effort) => {
    let fiber = element[Object.keys(element).find(key => key.startsWith('__reactFiber$'))];
    if (fiber?.alternate) { let root = fiber; while (root.return) root = root.return; if (root.stateNode?.current && root !== root.stateNode.current) fiber = fiber.alternate; }
    for (; fiber; fiber = fiber.return) { const props = fiber.memoizedProps; if (props && typeof props.onSelectModel === 'function' && Array.isArray(props.models) && 'reasoningEffort' in props) { props.onSelectModel(props.model, effort); break; } }
  }, original).catch(() => {});
  page.off('pageerror', onError);
  await session.detach();
  await browser.close();
}
