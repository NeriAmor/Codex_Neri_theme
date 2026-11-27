import { cutArea, watchStream } from '@woodfish/renderer-runtime';
import { findStreamingReply } from '@upstream/apps/chatgpt-app/src/renderer/effects';

const chatTurn = '[data-chatgpt-conversation-selection-target] [data-talvt-turn-state="in_progress"]';
const chatReply = '[data-markdown-text-style="assistant-message"]';
const codexTimeline = '[data-app-action-timeline-scroll]';
const codexComposerCover = '[data-thread-scroll-footer] > .bg-surface.pointer-events-none';

function findChatGptReply() {
  const turns = document.querySelectorAll(chatTurn);
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn.closest('[inert], [aria-hidden="true"]') ||
        !turn.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
    const replies = turn.querySelectorAll(chatReply);
    for (let j = replies.length - 1; j >= 0; j--) {
      const reply = replies[j];
      if (!reply.closest('[aria-hidden="true"], [hidden]')) return reply;
    }
  }
  return null;
}

export function trackReplyParticles(host) {
  let reply = null;
  let watcher = null;
  let frame = 0;

  function sync() {
    frame = 0;
    const native = findChatGptReply();
    const codex = native ? null : findStreamingReply();
    const next = native ?? (codex?.closest('[data-chatgpt-conversation-selection-target]') ? null : codex);
    if (next === reply) return;

    watcher?.dispose();
    watcher = null;
    reply = next;
    if (!reply) return;

    const timeline = reply.closest(codexTimeline);
    watcher = watchStream(reply, host, {
      cover(area) {
        const strip = timeline?.querySelector(codexComposerCover);
        return strip ? cutArea(area, { ...area, bottom: strip.getBoundingClientRect().top }) : area;
      },
    });
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(sync);
  }

  const observer = new MutationObserver((records) => {
    // The stream watcher already handles changes inside the active reply.
    if (records.some(record => !reply?.contains(record.target))) schedule();
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-talvt-turn-state', 'data-app-action-sidebar-thread-active', 'data-sidebar-indicator'],
  });
  const timer = setInterval(schedule, 400);
  sync();

  return () => {
    observer.disconnect();
    clearInterval(timer);
    if (frame) cancelAnimationFrame(frame);
    watcher?.dispose();
  };
}


