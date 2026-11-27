// Codex native model-menu adapter. No model catalog, quota, or conversation polling.
if (window.__codexEffortSlider?.version === 1) return;
window.__codexEffortSlider?.destroy();
const effects = createUpstreamEffort();
const mounts = new Map();
const labels = { none: '无', minimal: '极低', low: '轻度', medium: '中', high: '高', xhigh: '极高', max: 'Max', ultra: 'Ultra', persistent: '持续' };
const style = document.createElement('style');
style.id = 'codex-effort-slider-style';
style.textContent = sliderCss + `
[data-model-picker-power-slider][data-capsule-effort-mounted] > :not(.codex-effort-slider) { display:none!important }
.codex-effort-slider { width:100%;min-width:0;position:relative;--foreground:var(--color-text-primary,#eee);--muted-foreground:var(--color-text-secondary,#aaa);--popover:var(--color-surface-elevated-secondary,#242126);font:inherit }
.codex-effort-slider .ces-root { width:100%;min-width:0;outline-offset:3px }
.codex-effort-slider .ces-root:focus-visible { outline:2px solid #d5b5de;border-radius:20px }
@media (prefers-reduced-motion:reduce) { .codex-effort-slider .ces-star,.codex-effort-slider .ces-energy__sweep { animation-play-state:paused!important } }
`;
document.head.append(style);

function nativeState(trigger) {
  const key = Object.keys(trigger).find(key => key.startsWith('__reactFiber$'));
  let fiber = key && trigger[key];
  if (fiber?.alternate) {
    let root = fiber;
    while (root.return) root = root.return;
    if (root.stateNode?.current && root !== root.stateNode.current) fiber = fiber.alternate;
  }
  for (let node = fiber; node; node = node.return) {
    const props = node.memoizedProps;
    if (props && typeof props.onSelectModel === 'function' && Array.isArray(props.models) && typeof props.model === 'string' && 'reasoningEffort' in props) {
      const model = props.models.find(model => model.model === props.model);
      const levels = model?.supportedReasoningEfforts?.map(item => ({ effort: item.reasoningEffort, label: labels[item.reasoningEffort] || item.reasoningEffort })) || [];
      return { props, model, levels };
    }
  }
  return null;
}

function unmount(host, mount) {
  mount.slider.unmount();
  mount.container.remove();
  host.removeAttribute('data-capsule-effort-mounted');
  if (mount.row) {
    if (mount.tabIndex === null) mount.row.removeAttribute('tabindex');
    else mount.row.setAttribute('tabindex', mount.tabIndex);
  }
  mounts.delete(host);
}

function sync() {
  const active = new Set();
  for (const host of document.querySelectorAll('[role="menu"][data-state="open"] [data-model-picker-power-slider]')) {
    if (!host.getBoundingClientRect().width || host.closest('[inert],[aria-hidden="true"]')) continue;
    const menu = host.closest('[role="menu"]');
    const trigger = document.getElementById(menu.getAttribute('aria-labelledby'));
    const state = trigger && nativeState(trigger);
    // If the host interface changes, leave the native slider fully functional.
    if (!state || state.levels.length < 2 || state.props.showReasoningEffortControls === false) continue;
    active.add(host);
    let mount = mounts.get(host);
    if (!mount) {
      const container = document.createElement('div');
      container.className = 'codex-effort-slider';
      const row = host.closest('[data-reasoning-slider]');
      const seat = {
        baseName: state.model.displayName || state.props.model,
        effortLevels: state.levels,
        currentEffort: state.props.reasoningEffort,
        locked: Boolean(state.props.disabled || state.props.reasoningEffortDisabled),
        selectEffort(item) {
          const current = nativeState(trigger);
          if (!current || current.props.disabled || current.props.reasoningEffortDisabled || !current.levels.some(level => level.effort === item.effort)) return;
          // Same model, new effort; use the native action so Codex persists its own selection.
          current.props.onSelectModel(current.props.model, item.effort);
        },
      };
      const tabIndex = row?.getAttribute('tabindex') ?? null;
      row?.setAttribute('tabindex', '-1');
      host.append(container);
      const slider = effects.mountCodexEffortSlider({ container, row: container, seat, caption: '思考强度' });
      mount = { slider, seat, container, row, tabIndex, signature: '' };
      mounts.set(host, mount);
      host.setAttribute('data-capsule-effort-mounted', '');
      // Keep Radix's menu keyboard shortcuts from adjusting a second native slider.
      container.addEventListener('keydown', event => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', ' '].includes(event.key)) event.stopPropagation();
      });
    }
    const signature = JSON.stringify([state.props.model, state.props.reasoningEffort, state.levels, state.props.disabled, state.props.reasoningEffortDisabled]);
    if (signature !== mount.signature) {
      mount.signature = signature;
      Object.assign(mount.seat, { baseName: state.model.displayName || state.props.model, effortLevels: state.levels, currentEffort: state.props.reasoningEffort, locked: Boolean(state.props.disabled || state.props.reasoningEffortDisabled) });
      mount.slider.refresh();
    }
  }
  for (const [host, mount] of mounts) if (!active.has(host)) unmount(host, mount);
}

// Mutation filtering ignores canvas/style animation churn from the slider itself.
let scheduled = false;
const observer = new MutationObserver(records => {
  if (records.every(record => record.target.closest?.('.codex-effort-slider'))) return;
  if (!scheduled) {
    scheduled = true;
    queueMicrotask(() => { scheduled = false; sync(); });
  }
});
observer.observe(document.body, { childList: true, subtree: true });
const timer = setInterval(sync, 400);
function sliderKey(event) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  const container = event.target.closest?.('.codex-effort-slider');
  if (!container) return;
  for (const mount of mounts.values()) if (mount.container === container) {
    event.stopImmediatePropagation();
    mount.slider.handleKeyDown(event);
    break;
  }
}
// Codex's delegated menu handlers can consume End before the slider's keydown.
window.addEventListener('keydown', sliderKey, true);
window.__codexEffortSlider = {
  version: 1,
  destroy() {
    observer.disconnect();
    clearInterval(timer);
    window.removeEventListener('keydown', sliderKey, true);
    for (const [host, mount] of mounts) unmount(host, mount);
    style.remove();
    delete window.__codexEffortSlider;
  },
};
sync();
