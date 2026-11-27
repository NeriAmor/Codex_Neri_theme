/** Keep the rainbow caret centered in viewport coordinates, including CSS zoom. */
export function fitComposerCaret(caret) {
  if (!caret.visible || !caret.owner) return caret;

  const anchor = document.getSelection()?.anchorNode;
  const line = anchor instanceof Element ? anchor : anchor?.parentElement;
  const text = line && caret.owner.contains(line) ? line : caret.owner;
  const style = getComputedStyle(text);
  const textZoom = text.currentCSSZoom || 1;
  const lineHeight = Number.parseFloat(style.lineHeight) || 0;
  const height = Math.max(caret.height, lineHeight * textZoom) * 0.9;
  // Empty ChatGPT composers have no selection rect. Measure the placeholder's line break in viewport units.
  const placeholderBreak = text.matches('[data-placeholder]') && !text.textContent &&
    caret.owner.closest('[data-composer-input-layout="single-line"]')
    ? text.querySelector(':scope > br')?.getBoundingClientRect()
    : null;
  const lineCenter = placeholderBreak?.height
    ? placeholderBreak.top + placeholderBreak.height / 2
    : caret.y + caret.height / 2;
  let y = lineCenter - height / 2;

  // A fully visible line should keep the caret within the editor at its edges.
  const clip = caret.clip;
  if (clip && caret.y >= clip.top && caret.y + caret.height <= clip.bottom &&
      height <= clip.bottom - clip.top) {
    y = Math.max(clip.top, Math.min(y, clip.bottom - height));
  }

  // The overlay sits next to the editor, so its height is in its parent's local CSS units.
  const layerZoom = caret.owner.parentElement?.currentCSSZoom || 1;
  return { ...caret, y, height: height / layerZoom };
}

/** A zero-size sibling that translates viewport coordinates into its local CSS units. */
export function placeComposerCaretLayer(layer, caret) {
  const owner = caret.owner;
  if (owner && layer.previousElementSibling !== owner) {
    owner.after(layer);
    layer.setAttribute('aria-hidden', 'true');
    layer.setAttribute('inert', '');
    // ChatGPT's single-line composer applies sizing and clipping to every child.
    layer.style.cssText =
      'position:absolute;inset:auto;width:0;height:0!important;min-height:0;overflow:visible!important;pointer-events:none;user-select:none;';
  }

  const { left, top } = layer.getBoundingClientRect();
  const zoom = layer.currentCSSZoom || 1;
  const x = (value) => (value - left) / zoom;
  const y = (value) => (value - top) / zoom;
  const clip = caret.clip;
  layer.style.clipPath = clip
    ? `polygon(${x(clip.left)}px ${y(clip.top)}px, ${x(clip.right)}px ${y(clip.top)}px, ${x(clip.right)}px ${y(clip.bottom)}px, ${x(clip.left)}px ${y(clip.bottom)}px)`
    : '';

  return { x: x(caret.x), y: y(caret.y) };
}




