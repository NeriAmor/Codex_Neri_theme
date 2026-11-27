import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(new URL('../package.json', import.meta.url));
const { chromium } = require('playwright');
const artifacts = fileURLToPath(new URL('./artifacts/', import.meta.url));
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
try {
  const page = await browser.newPage({ viewport: { width: 700, height: 320 }, reducedMotion: 'no-preference' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' || message.text().startsWith('[Codex Typing Effects]')) errors.push(message.text()); });
  await page.setContent(`
    <main data-app-shell-frame style="background:#201c2a;color:white;padding:42px;height:205px;font:24px system-ui">
      <aside data-app-action-sidebar-thread-row data-app-action-sidebar-thread-active="true"></aside>
      <section data-app-action-timeline-scroll>
        <div data-markdown-text-style="assistant-message"><p id="reply">Working</p></div>
      </section>
      <section data-codex-composer-root style="zoom:1.3">
        <div contenteditable="true" style="outline:1px solid #777;padding:16px;">Draft </div>
      </section>
    </main>`);
  await page.evaluate(() => {
    window.paintedColors = new Set();
    const fill = CanvasRenderingContext2D.prototype.fill;
    CanvasRenderingContext2D.prototype.fill = function (...args) {
      if (this.canvas.closest('[data-codex-typing-effects]')) window.paintedColors.add(this.fillStyle);
      return fill.apply(this, args);
    };
  });
  await page.addScriptTag({ path: fileURLToPath(new URL('../codex/typing-effects/effects.js', import.meta.url)) });
  const statuses = await page.evaluate(() => window.__codexTypingEffects.status());
  assert.deepEqual(statuses, [
    { id: 'caret', state: 'running', colors: 'theme' },
    { id: 'typing-particles', state: 'running', colors: 'rainbow' },
  ]);

  const editor = page.locator('[contenteditable]');
  await editor.focus();
  await page.keyboard.press('End');
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-woodfish-caret-visible'));
  assert.equal(await editor.evaluate(el => getComputedStyle(el).caretColor), 'rgba(0, 0, 0, 0)');
  const gradient = await page.locator('[data-woodfish-caret] > i').evaluate(el => getComputedStyle(el, '::before').backgroundImage);
  assert.match(gradient, /^linear-gradient\(/);
  assert.deepEqual([...new Set(gradient.match(/rgb\([\d, ]+\)/g))], [
    'rgb(255, 208, 232)', 'rgb(255, 143, 196)', 'rgb(249, 78, 158)', 'rgb(220, 57, 126)',
  ]);
  const getColorPhase = () => page.locator('[data-woodfish-caret] > i').evaluate(el => getComputedStyle(el, '::before').transform);
  const phase = await getColorPhase();
  await page.waitForFunction(phase => getComputedStyle(document.querySelector('[data-woodfish-caret] > i'), '::before').transform !== phase, phase);
  await page.keyboard.type('color');
  await page.waitForFunction(() => window.paintedColors.size > 1);
  await page.screenshot({ path: artifacts + 'typing-effects.png' });
  await editor.evaluate(el => {
    el.style.font = '16px/20px STKaiti, sans-serif';
  });
  const cdp = await page.context().newCDPSession(page);
  for (const text of ['woaiwode', '我爱我的']) {
    await cdp.send('Input.imeSetComposition', {
      text, selectionStart: text.length, selectionEnd: text.length,
    });
    await page.waitForFunction(expected => {
      const selection = document.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0).getClientRects()[0] : null;
      const caret = document.querySelector('[data-woodfish-caret]:not([hidden])');
      if (!range || !caret || !selection.anchorNode?.textContent.endsWith(expected)) return false;
      const bar = caret.getBoundingClientRect();
      return Math.abs(bar.left - range.left) < 1 &&
        Math.abs(bar.top + bar.height / 2 - (range.top + range.height / 2)) < 1 &&
        Math.abs(bar.height - 23.4) < 0.5 && getComputedStyle(caret).transitionDuration === '0s';
    }, text, { timeout: 2000 });
  }
  await cdp.send('Input.insertText', { text: '我爱我的' });
  await page.screenshot({ path: artifacts + 'pink-caret.png' });

  await editor.blur();
  await page.waitForFunction(() => document.querySelector('[data-woodfish-caret]')?.hidden);

  await page.evaluate(() => {
    const composer = document.createElement('div');
    composer.setAttribute('data-composer-input', '');
    composer.className = 'chat-home-single-line';
    composer.setAttribute('data-composer-input-layout', 'single-line');
    const hostStyle = document.createElement('style');
    hostStyle.textContent = '.chat-home-single-line { zoom: 1.3; font: 16px/20px STKaiti, sans-serif; } .chat-home-single-line > * { height: 100% !important; overflow: hidden; } .chat-home-single-line p { margin: 0; }';
    document.head.append(hostStyle);
    composer.innerHTML = '<div role="textbox" aria-label="询问 ChatGPT" data-composer-markdown contenteditable="true"><p data-placeholder="询问 ChatGPT"><br></p></div>';
    document.querySelector('[data-app-shell-frame]').append(composer);
  });
  const chatEditor = page.getByRole('textbox', { name: '询问 ChatGPT' });
  await chatEditor.focus();
  await page.waitForFunction(() =>
    !!document.querySelector('[data-composer-markdown] + [data-woodfish-caret-clip] [data-woodfish-caret]:not([hidden])'),
    null, { timeout: 2000 },
  );
  assert.equal(await chatEditor.evaluate(el => getComputedStyle(el).caretColor), 'rgba(0, 0, 0, 0)');
  const chatCaretLayer = await chatEditor.evaluate(el => {
    const style = getComputedStyle(el.nextElementSibling);
    return { height: el.nextElementSibling.getBoundingClientRect().height, overflow: style.overflow };
  });
  assert.deepEqual(chatCaretLayer, { height: 0, overflow: 'visible' });
  const placeholderError = await chatEditor.evaluate(el => {
    const line = el.querySelector('[data-placeholder] br').getBoundingClientRect();
    const caret = el.nextElementSibling.querySelector('[data-woodfish-caret]').getBoundingClientRect();
    return Math.abs((caret.top + caret.bottom - line.top - line.bottom) / 2);
  });
  assert.ok(placeholderError < 0.5, `Empty ChatGPT caret is ${placeholderError}px off center`);
  await page.screenshot({ path: artifacts + 'chat-mode-pink-caret.png' });
  await page.keyboard.insertText('对话');
  await chatEditor.evaluate(el => el.querySelector('p').removeAttribute('data-placeholder'));
  await page.waitForFunction(() => {
    const e = document.querySelector('[data-composer-markdown]');
    const r = document.getSelection().getRangeAt(0).getClientRects()[0];
    const caret = e.nextElementSibling.querySelector('[data-woodfish-caret]').getBoundingClientRect();
    return r && Math.abs(caret.x - r.x) < 1 &&
      Math.abs((caret.top + caret.bottom - r.top - r.bottom) / 2) < 1;
  }, null, { timeout: 2000 });
  await chatEditor.blur();
  await page.waitForFunction(() => document.querySelector('[data-woodfish-caret]')?.hidden);
  assert.notEqual(await chatEditor.evaluate(el => getComputedStyle(el).caretColor), 'rgba(0, 0, 0, 0)');

  await page.evaluate(() => {
    const spinner = document.createElement('i');
    spinner.className = 'motion-safe:animate-spin';
    document.querySelector('aside').append(spinner);
  });
  await page.waitForFunction(() => document.querySelector('#reply'), null, { timeout: 1000 });
  await new Promise(resolve => setTimeout(resolve, 550));
  await page.evaluate(() => {
    window.paintedColors.clear();
    document.querySelector('#reply').firstChild.appendData(' with streaming particles');
  });
  await page.waitForFunction(() => window.paintedColors.size > 1, null, { timeout: 3000 });
  await page.screenshot({ path: artifacts + 'streaming-particles.png' });

  await page.evaluate(() => {
    document.querySelector('aside i').remove();
    const transcript = document.createElement('section');
    transcript.setAttribute('data-chatgpt-conversation-selection-target', 'fixture');
    transcript.innerHTML = `
      <div data-talvt-turn-state="complete">
        <div data-markdown-text-style="assistant-message"><p id="chatgpt-history">Previous answer</p></div>
      </div>
      <div data-talvt-turn-state="in_progress" id="chatgpt-turn">
        <div data-turn-response data-local-conversation-final-assistant><div data-markdown-text-style="assistant-message" data-markdown-animated><p id="chatgpt-reply">New answer</p></div></div>
      </div>`;
    document.querySelector('[data-app-shell-frame]').prepend(transcript);
  });
  await page.waitForTimeout(750);
  await page.evaluate(() => {
    window.paintedColors.clear();
    document.querySelector('#chatgpt-history').firstChild.appendData(' historic edit');
  });
  await page.waitForTimeout(120);
  assert.equal(await page.evaluate(() => window.paintedColors.size), 0);
  await page.evaluate(() => {
    document.querySelector('#chatgpt-reply').firstChild.appendData(' with ChatGPT rainbow particles');
  });
  await page.waitForFunction(() => window.paintedColors.size > 1, null, { timeout: 2500 });
  await page.screenshot({ path: artifacts + 'chatgpt-streaming-particles.png' });

  await page.evaluate(() => document.querySelector('#chatgpt-turn').setAttribute('data-talvt-turn-state', 'complete'));
  await page.waitForTimeout(750);
  await page.evaluate(() => {
    window.paintedColors.clear();
    document.querySelector('#chatgpt-reply').firstChild.appendData(' after completion');
  });
  await page.waitForTimeout(120);
  assert.equal(await page.evaluate(() => window.paintedColors.size), 0);

  await page.evaluate(() => window.__codexTypingEffects.dispose());
  assert.equal(await page.locator('[data-codex-typing-effects], [data-woodfish-caret]').count(), 0);
  assert.deepEqual(errors, []);
  console.log('7 passed: both carets, rainbow typing, IME alignment, Codex and ChatGPT streaming, completed replies ignored, clean disposal');
} finally {
  await browser.close();
}






