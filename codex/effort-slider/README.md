# Codex effort slider

UI/motion engine from Lumidarin/agy-capsule at aefb05b938628b14e5773f7b03427fad0b95374e (App 1.5.2), itself adapting LLYSH-HANNARI/antigravity-Codex-Claude-effort-slider. Retain LICENSE-agy-capsule and ../THIRD-PARTY-NOTICES.md when redistributing.

Only effort_upstream.mjs and motion_themes.mjs are reused. No Antigravity SDK, databases, account calls, quota, update mechanism, or model-picker replacement is installed. The motion module includes upstream shared painters, but only slider rendering is mounted.

bundle.mjs serializes the UI factories and runtime.js for the existing local Codex bridge. runtime.js mounts inside the native model menu's existing power-slider container and calls the current native onSelectModel(model, effort) action. It reads supportedReasoningEfforts from the same native catalog; never invent tiers or change models when selecting effort. Native control remains in the DOM for automatic fallback and is restored on unmount. This is an unofficial UI adapter depending on Codex's renderer interface.

Local upstream changes: correct notice link, use viewport-scaled knob radius for CSS-zoom pointer coordinates, expose handleKeyDown so Codex's delegated menu shortcuts cannot consume End before the slider. The runtime only captures slider keys when the event targets this slider. Native model menu and all other shortcuts are unchanged.

Verification: node test/live-effort-slider.mjs against the real running desktop (CDP 9340). Temporarily changes native model/effort and restores both in finally; never sends a message. Captures before/after, drag/keyboard, six/five-tier models, menu reopen, reduced-motion, idempotent reinjection and native fallback. Artifacts are local screenshots and effort-slider-report.json.
