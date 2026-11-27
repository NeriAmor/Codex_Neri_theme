import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { effortSliderScript } from '../codex/effort-slider/bundle.mjs';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9340');
const page = browser.contexts().flatMap(context => context.pages()).find(page => page.url() === 'app://-/index.html');
const errors = [];
const onError = error => errors.push(error.message);
page.on('pageerror', onError);
const trigger = () => page.locator('[data-composer-navigation-target="reasoning"]').filter({ visible: true });
const slider = () => page.locator('.codex-effort-slider .ces-root').filter({ visible: true });
let checks = 0, original;
const check = (value, message) => { assert.ok(value, message); checks++; };
const shot = async name => page.locator('[role="menu"][data-state="open"]').filter({ visible: true }).screenshot({ path: fileURLToPath(new URL('../artifacts/' + name, import.meta.url)) });
async function propsAction(action, value) {
  return trigger().evaluate((element, { action, value }) => {
    let fiber = element[Object.keys(element).find(key => key.startsWith('__reactFiber$'))];
    if (fiber?.alternate) {
      let root = fiber; while (root.return) root = root.return;
      if (root.stateNode?.current && root !== root.stateNode.current) fiber = fiber.alternate;
    }
    for (let node = fiber; node; node = node.return) {
      const props = node.memoizedProps;
      if (props && typeof props.onSelectModel === 'function' && Array.isArray(props.models) && 'reasoningEffort' in props) {
        if (action === 'set') props.onSelectModel(value.model, value.effort);
        return { model: props.model, effort: props.reasoningEffort, models: props.models.map(model => ({ model: model.model, levels: model.supportedReasoningEfforts.map(item => item.reasoningEffort) })) };
      }
    }
    throw Error('Native Codex model selector unavailable');
  }, { action, value });
}
async function waitEffort(effort) {
  await page.waitForFunction(effort => [...document.querySelectorAll('[data-composer-navigation-target="reasoning"]')].some(element => element.getBoundingClientRect().width && element.dataset.selectedReasoningEffort === effort), effort);
}
async function open() {
  if (await trigger().getAttribute('aria-expanded') !== 'true') await trigger().click();
  await slider().waitFor();
}
try {
  original = await propsAction('get');
  await page.evaluate(() => window.__codexEffortSlider?.destroy());
  await trigger().click();
  await page.locator('[data-model-picker-power-slider]').filter({ visible: true }).waitFor();
  await shot('28-effort-native.png');
  await page.keyboard.press('Escape');
  await page.evaluate(effortSliderScript);
  await open();
  check(await slider().count() === 1, 'one animated slider in the native model menu');
  check(await slider().getAttribute('aria-valuetext') === '中', 'initial native effort is displayed');
  check(await slider().getAttribute('aria-valuemax') === '5', 'six host-supported levels');
  check(await page.locator('[data-capsule-effort-mounted] > :not(.codex-effort-slider)').evaluate(element => getComputedStyle(element).display === 'none'), 'original slider hidden only after successful mount');
  await shot('29-effort-medium.png');
  const track = page.locator('.codex-effort-slider .ces-track');
  const box = await track.boundingBox();
  const radius = box.height / 2;
  const at = index => box.x + radius + (box.width - 2 * radius) * index / 5;
  await page.mouse.move(at(1), box.y + radius);
  await page.mouse.down();
  await page.mouse.move(at(4), box.y + radius, { steps: 15 });
  check(await trigger().getAttribute('data-selected-reasoning-effort') === original.effort, 'dragging previews without committing');
  await page.screenshot({ path: fileURLToPath(new URL('../artifacts/30-effort-drag.png', import.meta.url)) });
  await page.mouse.up();
  await waitEffort('max');
  check(await trigger().getAttribute('aria-expanded') === 'true', 'release commits Max and keeps menu open');
  await shot('31-effort-max.png');
  await slider().focus(); await page.keyboard.press('Home'); await waitEffort('low');
  check(true, 'Home changes native effort to low');
  await slider().focus(); await page.keyboard.press('ArrowRight'); await waitEffort('medium');
  check(true, 'ArrowRight changes exactly one tier');
  await slider().focus(); await page.keyboard.press('End'); await waitEffort('ultra');
  check(true, 'End selects the highest host-supported tier');
  await shot('32-effort-ultra.png');
  await page.keyboard.press('Escape');
  await open();
  check(await slider().getAttribute('aria-valuetext') === 'Ultra', 'reopened slider reads persisted native selection');
  check(await slider().count() === 1, 'reopening does not duplicate slider');

  // A real host model with fewer levels exercises catalog changes, never a mock.
  await page.keyboard.press('Escape');
  const shortModel = original.models.find(model => model.levels.length > 1 && model.levels.length < 6);
  check(Boolean(shortModel), 'host has a five-tier model to verify dynamic bounds');
  await propsAction('set', { model: shortModel.model, effort: 'medium' });
  await waitEffort('medium');
  await open();
  check(await slider().getAttribute('aria-valuemax') === String(shortModel.levels.length - 1), 'model switch changes slider bounds');
  await slider().focus(); await slider().focus(); await page.keyboard.press('End'); await waitEffort(shortModel.levels.at(-1));
  check(await slider().getAttribute('aria-valuetext') === 'Max', 'five-tier model ends at Max, without synthetic Ultra');
  await shot('33-effort-five-levels.png');
  await page.keyboard.press('Escape');
  await propsAction('set', original); await waitEffort(original.effort);
  await open();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  check(await page.locator('.codex-effort-slider .ces-energy__sweep').evaluate(element => getComputedStyle(element).animationPlayState === 'paused'), 'reduced motion pauses decorative sweep');
  await page.emulateMedia({ reducedMotion: null });
  await page.evaluate(effortSliderScript);
  check(await slider().count() === 1, 'repeated service injection remains idempotent');
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__codexEffortSlider.destroy());
  await trigger().click();
  check(await page.locator('[data-model-picker-power-slider] > span').filter({ visible: true }).count() > 0, 'destroy restores original native control');
  await page.keyboard.press('Escape');
  await page.evaluate(effortSliderScript);
  await open();
  await shot('34-effort-installed-preview.png');
  check(errors.length === 0, 'no renderer errors');
  const report = { checks, failures: 0, original, errors, source: 'Real running Codex desktop via CDP, no simulated selector', limitations: 'No message sent; verifies native selection and menu reopen, not a subsequent model response or cold application restart.' };
  writeFileSync(new URL('../artifacts/effort-slider-report.json', import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await page.mouse.up().catch(() => {});
  await page.emulateMedia({ reducedMotion: null }).catch(() => {});
  if (original) await propsAction('set', original).catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
  page.off('pageerror', onError);
  await browser.close();
}
