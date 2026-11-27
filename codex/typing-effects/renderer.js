import { startEffectHost } from '@woodfish/renderer-runtime';
import { watchEditableTyping } from '@woodfish/renderer-runtime';
import { normalizeEffectManifest, normalizeEffectValues } from '@woodfish/theme-core';
import { trackReplyParticles } from './reply-particles.js';
import caret from '@upstream/packages/effects/builtin/caret/effect.js';
import caretSpec from '@upstream/packages/effects/builtin/caret/effect.json';
import particles from '@upstream/packages/effects/builtin/typing-particles/effect.js';
import particleSpec from '@upstream/packages/effects/builtin/typing-particles/effect.json';

import { fitComposerCaret, placeComposerCaretLayer } from './composer-caret.js';

const key = '__codexTypingEffects';
const editor = ':is([data-codex-composer-root] [contenteditable="true"], [data-composer-input] [data-composer-markdown][contenteditable="true"])';

if (!window[key] && document.querySelector('[data-app-shell-frame]')) {
  const root = document.documentElement;
  const host = startEffectHost({
    host: 'codex',
    idPrefix: 'codex-typing-effects',
    nodeAttributes: { 'data-codex-typing-effects': '' },
    selectors: { composerEditor: editor, editorRoot: '[data-codex-composer-root]' },
    lib: { placeCaretLayer: placeComposerCaretLayer },
    theme: () => ({
      mode: root.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
      stops: ['#ffd0e8', '#ff8fc4', '#f94e9e', '#dc397e'], accent: '', accent2: '', background: '', foreground: '',
    }),
    reducedMotion: () => root.getAttribute('data-reduced-motion') === 'true',
    onError: (id, message) => console.warn('[Codex Typing Effects]', id, message),
  });

  host.apply([
    ['caret', caretSpec, caret, { colors: 'theme', smoothCaretAnimation: 'off' }],
    ['typing-particles', particleSpec, particles, { colors: 'rainbow' }],
  ].map(([id, spec, effect, values]) => {
    const manifest = normalizeEffectManifest(spec);
    return {
      id,
      manifest,
      values: normalizeEffectValues(manifest, values),
      hash: id,
      factory: (module) => { module.exports = effect; },
    };
  }));

  const stopTyping = watchEditableTyping(editor, {
    insert: host.insert,
    caret: (event) => host.caret(fitComposerCaret(event)),
  });
  const stopStreaming = trackReplyParticles(host);
  const theme = new MutationObserver(() => host.themeChanged());
  theme.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  window[key] = {
    status: () => host.status().map(({ id, state, values }) => ({ id, state, colors: values.colors })),
    dispose() {
      theme.disconnect();
      stopTyping();
      stopStreaming();
      host.dispose();
      delete window[key];
    },
  };
}






