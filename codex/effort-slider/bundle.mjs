import { readFileSync } from 'node:fs';
import { createMotionThemes } from './motion_themes.mjs';
import { createUpstreamEffort, UPSTREAM_EFFORT_CSS } from './effort_upstream.mjs';

// Reuse only the slider's UI/motion engine, without Antigravity services or telemetry.
const runtime = readFileSync(new URL('./runtime.js', import.meta.url), 'utf8');
export const effortSliderScript = `(() => {
const createMotionThemes = ${createMotionThemes.toString()};
let themes;
const motionThemes = () => themes ??= createMotionThemes();
const createUpstreamEffort = ${createUpstreamEffort.toString()};
const sliderCss = ${JSON.stringify(UPSTREAM_EFFORT_CSS)};
${runtime}
})()`;
