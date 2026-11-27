(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key2 of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key2) && key2 !== except)
          __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // upstream/packages/effects/builtin/caret/effect.js
  var require_effect = __commonJS({
    "upstream/packages/effects/builtin/caret/effect.js"(exports, module) {
      "use strict";
      module.exports = function caret2(ctx) {
        const clip = document.createElement("div");
        clip.setAttribute("data-woodfish-caret-clip", "");
        const bar = document.createElement("div");
        bar.setAttribute("data-woodfish-caret", "");
        bar.hidden = true;
        clip.append(bar);
        let last = null;
        let typedAt = 0;
        let cancelSettle = null;
        function colors() {
          const theme = ctx.theme();
          if (ctx.params.colors === "rainbow") return ctx.rainbow;
          if (ctx.params.colors === "theme") return theme.stops;
          return Array.isArray(theme.cursor) && theme.cursor.length > 1 ? theme.cursor : ctx.rainbow;
        }
        const BLINK = {
          blink: "@keyframes woodfish-caret-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }",
          smooth: "@keyframes woodfish-caret-blink { 0%, 20% { opacity: 1; } 60%, 80% { opacity: 0; } 100% { opacity: 1; } }",
          phase: "@keyframes woodfish-caret-blink { 0%, 20% { opacity: 1; } 90%, 100% { opacity: 0; } }",
          expand: "@keyframes woodfish-caret-blink { 0%, 20% { transform: scaleY(1); } 80%, 100% { transform: scaleY(0); } }"
        };
        function restyle() {
          const p = ctx.params;
          const stops = colors();
          const blink = BLINK[p.blinking];
          const glow = p.glow > 0 ? `box-shadow: 0 0 ${4 + p.glow * 8}px color-mix(in oklab, ${stops[0]} ${Math.round(p.glow * 80)}%, transparent);` : "";
          ctx.style(`
:root[data-woodfish-caret-visible="true"] ${ctx.selectors.composerEditor} {
  caret-color: transparent !important;
}
[data-woodfish-caret-clip] {
  position: absolute;
  inset: 0;
}
[data-woodfish-caret] {
  position: absolute;
  left: 0;
  top: 0;
  width: ${p.width}px;
  will-change: transform;
}
[data-woodfish-caret][data-glide] {
  transition: transform 80ms linear;
}
[data-woodfish-caret] > i {
  position: absolute;
  inset: 0;
  border-radius: ${p.radius}px;
  overflow: hidden;
  ${glow}
  ${blink ? "animation: woodfish-caret-blink 1.06s ease-in-out infinite;" : ""}
}
[data-woodfish-caret][data-typing] > i {
  animation: none;
}
[data-woodfish-caret] > i::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 900%;
  background: linear-gradient(180deg, var(--woodfish-caret-stops, ${[...stops, stops[0]].join(", ")}));
  animation: woodfish-caret-flow ${p.flowSeconds}s linear infinite;
}
@keyframes woodfish-caret-flow {
  from { transform: translateY(0); }
  to { transform: translateY(-88.8889%); }
}
${blink || ""}
:root[data-woodfish-paused] [data-woodfish-caret] > i,
:root[data-woodfish-paused] [data-woodfish-caret] > i::before {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  [data-woodfish-caret] { transition: none !important; }
  [data-woodfish-caret] > i, [data-woodfish-caret] > i::before { animation: none; }
  [data-woodfish-caret] > i::before { height: 100%; }
}`);
        }
        bar.append(document.createElement("i"));
        ctx.onInsert((event) => {
          if (event.source === "user") typedAt = performance.now();
        });
        ctx.onCaret((caret3) => {
          if (caret3.source !== "user") return;
          if (!caret3.visible || caret3.height <= 0) {
            document.documentElement.removeAttribute("data-woodfish-caret-visible");
            bar.hidden = true;
            last = null;
            return;
          }
          const mode = ctx.params.smoothCaretAnimation;
          const typing = performance.now() - typedAt < 60;
          const glide = last !== null && !ctx.simplified() && (mode === "on" || mode === "explicit" && !typing);
          bar.toggleAttribute("data-glide", glide);
          document.documentElement.setAttribute("data-woodfish-caret-visible", "true");
          const { x, y } = ctx.lib.placeCaretLayer(clip, caret3);
          bar.style.height = `${caret3.height}px`;
          bar.style.transform = `translate(${x}px, ${y}px)`;
          bar.hidden = false;
          last = caret3;
          bar.setAttribute("data-typing", "");
          if (cancelSettle) cancelSettle();
          cancelSettle = ctx.later(500, () => bar.removeAttribute("data-typing"));
        });
        ctx.onTheme(restyle);
        restyle();
        return {
          update: restyle,
          dispose: () => {
            document.documentElement.removeAttribute("data-woodfish-caret-visible");
            clip.remove();
          }
        };
      };
    }
  });

  // upstream/packages/effects/builtin/typing-particles/effect.js
  var require_effect2 = __commonJS({
    "upstream/packages/effects/builtin/typing-particles/effect.js"(exports, module) {
      "use strict";
      module.exports = function typingParticles(ctx) {
        const MAX_PER_SECOND = 240;
        const dots = [];
        let budget = MAX_PER_SECOND;
        let budgetAt = 0;
        function palette() {
          if (ctx.params.colors === "single") return [ctx.params.color];
          if (ctx.params.colors === "rainbow") return ctx.rainbow;
          return ctx.theme().stops;
        }
        const painter = ctx.painter((g, now, dt) => {
          const seconds = dt / 1e3;
          const drag = Math.pow(0.9, dt / 16.7);
          g.globalCompositeOperation = ctx.theme().mode === "dark" ? "lighter" : "source-over";
          for (let i = dots.length - 1; i >= 0; i -= 1) {
            const dot = dots[i];
            const age = now - dot.born;
            if (age >= dot.life) {
              dots.splice(i, 1);
              continue;
            }
            dot.vy += ctx.params.gravity * seconds;
            dot.vx *= drag;
            dot.x += dot.vx * seconds;
            dot.y += dot.vy * seconds;
            const left = 1 - Math.max(0, age) / dot.life;
            g.globalAlpha = Math.min(1, left * 1.4);
            g.fillStyle = dot.color;
            g.beginPath();
            g.arc(dot.x, dot.y, dot.size * (0.55 + 0.45 * left), 0, Math.PI * 2);
            g.fill();
          }
          return dots.length > 0;
        });
        function shake(event) {
          const target = event.block && event.block.closest(ctx.selectors.editorRoot || "*");
          if (!target || typeof target.animate !== "function") return;
          const x = (Math.random() - 0.5) * 6;
          const y = (Math.random() - 0.5) * 4;
          target.animate(
            [
              { transform: "translate(0, 0)" },
              { transform: `translate(${x}px, ${y}px)` },
              { transform: "translate(0, 0)" }
            ],
            { duration: 120, easing: "ease-out" }
          );
        }
        ctx.onInsert((event) => {
          const wanted = ctx.params.sources;
          if (wanted !== "all" && wanted !== event.source || !event.text || ctx.simplified()) return;
          const now = performance.now();
          budget = Math.min(MAX_PER_SECOND, budget + (now - budgetAt) / 1e3 * MAX_PER_SECOND);
          budgetAt = now;
          const count = Math.min(Math.round(ctx.params.count), Math.floor(budget));
          if (count <= 0) return;
          budget -= count;
          const colors = palette();
          const spread = ctx.params.spread * Math.PI / 180;
          for (let i = 0; i < count; i += 1) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
            const speed = ctx.params.speed * (0.4 + Math.random() * 0.6);
            dots.push({
              x: event.x,
              y: event.y + event.height * 0.6,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: ctx.params.size * (0.6 + Math.random() * 0.4),
              life: ctx.params.life * (0.6 + Math.random() * 0.4),
              born: now,
              color: colors[Math.floor(Math.random() * colors.length)]
            });
          }
          if (ctx.params.shake && event.source === "user") shake(event);
          painter.wake();
        });
        return {
          update() {
            painter.wake();
          }
        };
      };
    }
  });

  // upstream/packages/theme-core/src/color/validate.ts
  var HEX_COLOR_PATTERN = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
  var CSS_NAMED_COLORS = /* @__PURE__ */ new Set([
    "aliceblue",
    "antiquewhite",
    "aqua",
    "aquamarine",
    "azure",
    "beige",
    "bisque",
    "black",
    "blanchedalmond",
    "blue",
    "blueviolet",
    "brown",
    "burlywood",
    "cadetblue",
    "chartreuse",
    "chocolate",
    "coral",
    "cornflowerblue",
    "cornsilk",
    "crimson",
    "cyan",
    "darkblue",
    "darkcyan",
    "darkgoldenrod",
    "darkgray",
    "darkgreen",
    "darkgrey",
    "darkkhaki",
    "darkmagenta",
    "darkolivegreen",
    "darkorange",
    "darkorchid",
    "darkred",
    "darksalmon",
    "darkseagreen",
    "darkslateblue",
    "darkslategray",
    "darkslategrey",
    "darkturquoise",
    "darkviolet",
    "deeppink",
    "deepskyblue",
    "dimgray",
    "dimgrey",
    "dodgerblue",
    "firebrick",
    "floralwhite",
    "forestgreen",
    "fuchsia",
    "gainsboro",
    "ghostwhite",
    "gold",
    "goldenrod",
    "gray",
    "green",
    "greenyellow",
    "grey",
    "honeydew",
    "hotpink",
    "indianred",
    "indigo",
    "ivory",
    "khaki",
    "lavender",
    "lavenderblush",
    "lawngreen",
    "lemonchiffon",
    "lightblue",
    "lightcoral",
    "lightcyan",
    "lightgoldenrodyellow",
    "lightgray",
    "lightgreen",
    "lightgrey",
    "lightpink",
    "lightsalmon",
    "lightseagreen",
    "lightskyblue",
    "lightslategray",
    "lightslategrey",
    "lightsteelblue",
    "lightyellow",
    "lime",
    "limegreen",
    "linen",
    "magenta",
    "maroon",
    "mediumaquamarine",
    "mediumblue",
    "mediumorchid",
    "mediumpurple",
    "mediumseagreen",
    "mediumslateblue",
    "mediumspringgreen",
    "mediumturquoise",
    "mediumvioletred",
    "midnightblue",
    "mintcream",
    "mistyrose",
    "moccasin",
    "navajowhite",
    "navy",
    "oldlace",
    "olive",
    "olivedrab",
    "orange",
    "orangered",
    "orchid",
    "palegoldenrod",
    "palegreen",
    "paleturquoise",
    "palevioletred",
    "papayawhip",
    "peachpuff",
    "peru",
    "pink",
    "plum",
    "powderblue",
    "purple",
    "rebeccapurple",
    "red",
    "rosybrown",
    "royalblue",
    "saddlebrown",
    "salmon",
    "sandybrown",
    "seagreen",
    "seashell",
    "sienna",
    "silver",
    "skyblue",
    "slateblue",
    "slategray",
    "slategrey",
    "snow",
    "springgreen",
    "steelblue",
    "tan",
    "teal",
    "thistle",
    "tomato",
    "transparent",
    "turquoise",
    "violet",
    "wheat",
    "white",
    "whitesmoke",
    "yellow",
    "yellowgreen"
  ]);
  function validateAlpha(component, numeric) {
    if (component === void 0) {
      return true;
    }
    const maximum = component.endsWith("%") ? 100 : 1;
    return numeric !== void 0 && numeric >= 0 && numeric <= maximum;
  }
  function isValidFunctionalColor(value) {
    const match = /^(rgba?|hsla?)\((.*)\)$/i.exec(value);
    if (!match || !/^[\d+\-.,%/.\s]+$/.test(match[2])) {
      return false;
    }
    const normalized = match[2].replace(/\s*\/\s*/, ",").replace(/\s+/g, ",");
    const components = normalized.split(",").filter(Boolean);
    const isRgb = match[1].toLowerCase().startsWith("rgb");
    const expected = match[1].toLowerCase().endsWith("a") ? 4 : components.length;
    if (components.length < 3 || components.length > 4 || expected !== components.length) {
      return false;
    }
    const numeric = components.map((component) => Number.parseFloat(component));
    if (numeric.some((component) => !Number.isFinite(component))) {
      return false;
    }
    if (isRgb) {
      return components.slice(0, 3).every((component, index) => {
        const maximum = component.endsWith("%") ? 100 : 255;
        return numeric[index] >= 0 && numeric[index] <= maximum;
      }) && validateAlpha(components[3], numeric[3]);
    }
    return numeric[1] >= 0 && numeric[1] <= 100 && components[1].endsWith("%") && numeric[2] >= 0 && numeric[2] <= 100 && components[2].endsWith("%") && validateAlpha(components[3], numeric[3]);
  }
  function isValidCssColor(value) {
    return HEX_COLOR_PATTERN.test(value) || CSS_NAMED_COLORS.has(value.toLowerCase()) || isValidFunctionalColor(value);
  }

  // upstream/packages/theme-core/src/effects/plugins.ts
  var EFFECT_HOSTS = ["codex", "vscode"];
  var EFFECT_ID = /^[a-z][a-z0-9-]{0,39}$/;
  var PARAM_KEY = /^[A-Za-z][A-Za-z0-9]{0,39}$/;
  var TEXT_LIMIT = 400;
  var PARAM_LIMIT = 40;
  var OPTION_LIMIT = 24;
  var EffectManifestError = class extends Error {
  };
  function text(value, fallback) {
    return typeof value === "string" ? value.slice(0, TEXT_LIMIT) : fallback;
  }
  function finite(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : void 0;
  }
  function readOptions(value, key2) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new EffectManifestError(`\u53C2\u6570 ${key2} \u662F select\uFF0C\u9700\u8981 options`);
    }
    return value.slice(0, OPTION_LIMIT).map((option) => {
      if (typeof option === "string") {
        return { value: option, label: option };
      }
      const entry = option ?? {};
      if (typeof entry.value !== "string") {
        throw new EffectManifestError(`\u53C2\u6570 ${key2} \u7684 options \u6BCF\u9879\u9700\u8981 value`);
      }
      return { value: entry.value, label: text(entry.label, entry.value) };
    });
  }
  function readParam(key2, raw) {
    if (raw === null || typeof raw !== "object") {
      throw new EffectManifestError(`\u53C2\u6570 ${key2} \u5E94\u8BE5\u662F\u4E00\u4E2A\u5BF9\u8C61`);
    }
    const spec = raw;
    const type = spec.type;
    const base = { label: text(spec.label, key2), description: text(spec.description, "") };
    if (type === "number") {
      const min = finite(spec.min);
      const max = finite(spec.max);
      const fallback = finite(spec.default);
      if (min === void 0 || max === void 0 || fallback === void 0 || min > max) {
        throw new EffectManifestError(`\u53C2\u6570 ${key2} \u662F number\uFF0C\u9700\u8981 default\u3001min\u3001max\uFF08min \u2264 max\uFF09`);
      }
      const step = finite(spec.step);
      return {
        ...base,
        type,
        default: Math.min(max, Math.max(min, fallback)),
        min,
        max,
        ...step !== void 0 && step > 0 ? { step } : {},
        ...typeof spec.unit === "string" && /^[a-z%]{0,4}$/.test(spec.unit) ? { unit: spec.unit } : {}
      };
    }
    if (type === "boolean") {
      return { ...base, type, default: spec.default === true };
    }
    if (type === "select") {
      const options = readOptions(spec.options, key2);
      const fallback = options.some((option) => option.value === spec.default) ? spec.default : options[0].value;
      return { ...base, type, default: fallback, options };
    }
    if (type === "color") {
      if (typeof spec.default !== "string" || !isValidCssColor(spec.default)) {
        throw new EffectManifestError(`\u53C2\u6570 ${key2} \u662F color\uFF0Cdefault \u9700\u8981\u662F #rrggbb \u8FD9\u7C7B\u989C\u8272`);
      }
      return { ...base, type, default: spec.default };
    }
    throw new EffectManifestError(`\u53C2\u6570 ${key2} \u7684 type \u53EA\u80FD\u662F number / boolean / select / color`);
  }
  function normalizeEffectManifest(raw) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new EffectManifestError("effect.json \u5E94\u8BE5\u662F\u4E00\u4E2A JSON \u5BF9\u8C61");
    }
    const input = raw;
    const hosts = Array.isArray(input.hosts) ? EFFECT_HOSTS.filter((host) => input.hosts.includes(host)) : [...EFFECT_HOSTS];
    const params = {};
    const rawParams = input.params ?? {};
    if (rawParams === null || typeof rawParams !== "object" || Array.isArray(rawParams)) {
      throw new EffectManifestError("params \u5E94\u8BE5\u662F\u4E00\u4E2A\u5BF9\u8C61");
    }
    for (const [key2, spec] of Object.entries(rawParams).slice(0, PARAM_LIMIT)) {
      if (!PARAM_KEY.test(key2) || key2 === "enabled") {
        throw new EffectManifestError(
          `\u53C2\u6570\u540D ${key2} \u65E0\u6548\uFF08\u5B57\u6BCD\u5F00\u5934\uFF0C\u53EA\u7528\u5B57\u6BCD\u548C\u6570\u5B57\uFF0C\u4E0D\u80FD\u53EB enabled\uFF09`
        );
      }
      params[key2] = readParam(key2, spec);
    }
    return {
      name: text(input.name, "\u672A\u547D\u540D\u6548\u679C"),
      description: text(input.description, ""),
      version: Math.max(1, Math.floor(finite(input.version) ?? 1)),
      hosts,
      enabled: input.enabled !== false,
      order: finite(input.order) ?? 100,
      params,
      ...typeof input.core === "string" && EFFECT_ID.test(input.core) ? { core: input.core } : {}
    };
  }
  function normalizeValue(spec, value) {
    switch (spec.type) {
      case "number": {
        const number = finite(value);
        return number === void 0 ? spec.default : Math.min(spec.max ?? number, Math.max(spec.min ?? number, number));
      }
      case "boolean":
        return typeof value === "boolean" ? value : spec.default;
      case "select":
        return typeof value === "string" && spec.options?.some((option) => option.value === value) ? value : spec.default;
      case "color":
        return typeof value === "string" && isValidCssColor(value) ? value : spec.default;
    }
  }
  function normalizeEffectValues(manifest, raw) {
    const input = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const values = {
      enabled: typeof input.enabled === "boolean" ? input.enabled : manifest.enabled
    };
    for (const [key2, spec] of Object.entries(manifest.params)) {
      values[key2] = normalizeValue(spec, input[key2]);
    }
    return values;
  }
  function patchEffectValues(manifest, values, patch) {
    if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
      return normalizeEffectValues(manifest, values);
    }
    return normalizeEffectValues(manifest, { ...values, ...patch });
  }
  function effectCssVariable(id, key2) {
    return `--woodfish-${id}-${key2.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
  }
  function effectCssVariables(id, manifest, values) {
    return Object.entries(manifest.params).flatMap(([key2, spec]) => {
      const name = effectCssVariable(id, key2);
      const value = values[key2];
      if (spec.type === "boolean") {
        return [`${name}: ${value ? 1 : 0};`];
      }
      if (spec.type === "number") {
        return [`${name}: ${String(value)}${spec.unit ?? ""};`];
      }
      return typeof value === "string" && (spec.type === "color" || /^[a-z0-9-]+$/i.test(value)) ? [`${name}: ${value};`] : [];
    });
  }
  var CSS_NUMBER = /^(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i;
  function valueFromCss(spec, text2) {
    switch (spec.type) {
      case "number": {
        const match = CSS_NUMBER.exec(text2);
        if (!match) {
          return void 0;
        }
        const unit = match[2].toLowerCase();
        const number = Number(match[1]);
        if (unit === "ms" && spec.unit === "s") {
          return normalizeValue(spec, number / 1e3);
        }
        if (unit === "s" && spec.unit === "ms") {
          return normalizeValue(spec, number * 1e3);
        }
        return unit === "" || unit === spec.unit ? normalizeValue(spec, number) : void 0;
      }
      case "boolean":
        return text2 === "1" || text2 === "true" ? true : text2 === "0" || text2 === "false" ? false : void 0;
      case "color":
        return isValidCssColor(text2) ? text2 : void 0;
      case "select":
        return spec.options?.some((option) => option.value === text2) ? text2 : void 0;
    }
  }
  function effectValuesFromCss(id, manifest, read) {
    const values = {};
    for (const [key2, spec] of Object.entries(manifest.params)) {
      const text2 = read(effectCssVariable(id, key2)).trim();
      const value = text2 ? valueFromCss(spec, text2) : void 0;
      if (value !== void 0) {
        values[key2] = value;
      }
    }
    return values;
  }

  // upstream/packages/renderer-runtime/src/styleManager.ts
  function createStyleManager(options) {
    const mounted = /* @__PURE__ */ new Map();
    const container = options.container ?? (() => document.head);
    function create(name) {
      const element = document.createElement("style");
      element.id = `${options.idPrefix}${name}`;
      for (const [attribute, value] of Object.entries(options.nodeAttributes ?? {})) {
        element.setAttribute(attribute, value);
      }
      return element;
    }
    function remove(name) {
      mounted.get(name)?.remove();
      mounted.delete(name);
    }
    return {
      upsert(name, css) {
        if (css.trim().length === 0) {
          remove(name);
          return;
        }
        let element = mounted.get(name);
        if (!element || !element.isConnected) {
          element = create(name);
          mounted.set(name, element);
          container().append(element);
        }
        if (element.textContent !== css) {
          element.textContent = css;
        }
      },
      remove,
      removeAll() {
        for (const element of mounted.values()) {
          element.remove();
        }
        mounted.clear();
      },
      names() {
        return [...mounted.keys()];
      }
    };
  }

  // upstream/packages/renderer-runtime/src/acrylic.ts
  var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  var ACRYLIC_FILTER_ID = "woodfish-acrylic";
  function svgElement(name, attributes) {
    const element = document.createElementNS(SVG_NAMESPACE, name);
    for (const [key2, value] of Object.entries(attributes)) {
      element.setAttribute(key2, String(value));
    }
    return element;
  }
  function mountAcrylicFilter(options) {
    const blur = Math.max(0, options.blur);
    const host = svgElement("svg", {
      width: 0,
      height: 0,
      "aria-hidden": "true",
      "data-woodfish-theme": "acrylic",
      style: "position:absolute;width:0;height:0;pointer-events:none",
      ...options.nodeAttributes ?? {}
    });
    const filter = svgElement("filter", {
      id: ACRYLIC_FILTER_ID,
      x: 0,
      y: 0,
      width: "100%",
      height: "100%",
      "color-interpolation-filters": "sRGB"
    });
    filter.append(
      svgElement("feGaussianBlur", {
        in: "SourceGraphic",
        stdDeviation: blur,
        edgeMode: "duplicate",
        result: "blur"
      }),
      svgElement("feTurbulence", {
        type: "fractalNoise",
        baseFrequency: 0.8,
        numOctaves: 3,
        stitchTiles: "stitch",
        result: "noise"
      }),
      svgElement("feColorMatrix", {
        in: "noise",
        type: "matrix",
        values: "0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.03 0",
        result: "grain"
      }),
      svgElement("feBlend", { in: "grain", in2: "blur", mode: "overlay" })
    );
    const definitions = svgElement("defs", {});
    host.append(definitions);
    definitions.append(filter);
    document.body.append(host);
    return () => host.remove();
  }

  // upstream/packages/renderer-runtime/src/tokenCss.ts
  function formatCssNumber(value) {
    return Number(value.toFixed(4)).toString();
  }
  function buildNoiseDataUri(opacity) {
    const svg = [
      "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>",
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/>",
      "<feColorMatrix type='saturate' values='0'/></filter>",
      `<rect width='100%' height='100%' filter='url(#n)' opacity='${formatCssNumber(opacity)}'/>`,
      "</svg>"
    ].join("");
    return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, "%27")}")`;
  }

  // upstream/packages/renderer-runtime/src/reveal.ts
  function startReveal(options) {
    const targetSelector = options.targets.join(",");
    let current = null;
    let pending = null;
    let frame = 0;
    function clear() {
      if (current) {
        current.removeAttribute("data-woodfish-reveal");
        current.style.removeProperty("--woodfish-reveal-x");
        current.style.removeProperty("--woodfish-reveal-y");
        current = null;
      }
    }
    function paint() {
      frame = 0;
      if (!pending) {
        return;
      }
      const { target, x, y } = pending;
      pending = null;
      const element = target instanceof Element ? target.closest(targetSelector) : null;
      if (element !== current) {
        clear();
        current = element;
        if (current) {
          current.setAttribute("data-woodfish-reveal", "true");
        }
      }
      if (current) {
        const bounds = current.getBoundingClientRect();
        current.style.setProperty("--woodfish-reveal-x", `${Math.round(x - bounds.left)}px`);
        current.style.setProperty("--woodfish-reveal-y", `${Math.round(y - bounds.top)}px`);
      }
    }
    function onPointerMove(event) {
      pending = { target: event.target, x: event.clientX, y: event.clientY };
      if (frame === 0) {
        frame = requestAnimationFrame(paint);
      }
    }
    function onPointerLeave() {
      pending = null;
      clear();
    }
    document.addEventListener("pointermove", onPointerMove, { passive: true, capture: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onPointerMove, { capture: true });
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
      clear();
    };
  }

  // upstream/packages/renderer-runtime/src/effectHost.ts
  var RAINBOW = Object.freeze([
    "#ff2d95",
    "#ff4500",
    "#ffd700",
    "#7cfc00",
    "#00ffff",
    "#1e90ff",
    "#9370db",
    "#ff00ff",
    "#ff1493"
  ]);
  var MAX_ERRORS = 3;
  var LAYER_Z_INDEX = "2147483000";
  function message(error) {
    return error instanceof Error ? error.message : String(error);
  }
  function sameValues(left, right) {
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every((key2) => left[key2] === right[key2]);
  }
  function startEffectHost(options) {
    const styles = createStyleManager({
      idPrefix: options.idPrefix,
      nodeAttributes: options.nodeAttributes,
      container: () => document.head ?? document.documentElement
    });
    const sources = /* @__PURE__ */ new Map();
    const running = /* @__PURE__ */ new Map();
    const failures = /* @__PURE__ */ new Map();
    const painters = /* @__PURE__ */ new Set();
    const coreValues = /* @__PURE__ */ new Map();
    let userStyle = null;
    const motionQuery = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    let layer = null;
    let canvas = null;
    let graphics = null;
    let frame = 0;
    let lastFrame = 0;
    let painted = false;
    let themeCache = null;
    let disposed = false;
    const reducedMotion = () => Boolean(motionQuery?.matches) || Boolean(options.reducedMotion?.());
    const active = () => document.visibilityState !== "hidden" && document.hasFocus();
    function theme() {
      themeCache ??= options.theme();
      return themeCache;
    }
    function ensureLayer() {
      if (layer?.isConnected) {
        return layer;
      }
      layer = document.createElement("div");
      layer.setAttribute("data-woodfish-effects-layer", "true");
      layer.setAttribute("aria-hidden", "true");
      for (const [name, value] of Object.entries(options.nodeAttributes ?? {})) {
        layer.setAttribute(name, value);
      }
      layer.style.cssText = `position:fixed;inset:0;z-index:${LAYER_Z_INDEX};pointer-events:none;overflow:hidden;contain:strict;`;
      (document.body ?? document.documentElement).append(layer);
      return layer;
    }
    function ensureCanvas() {
      if (graphics && canvas?.isConnected) {
        return graphics;
      }
      canvas = document.createElement("canvas");
      canvas.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;";
      ensureLayer().append(canvas);
      graphics = canvas.getContext("2d");
      resize();
      return graphics;
    }
    function resize() {
      if (!canvas) {
        return;
      }
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(innerWidth * ratio));
      canvas.height = Math.max(1, Math.round(innerHeight * ratio));
      painted = true;
      schedule();
    }
    function clear() {
      for (const entry of painters) {
        if (entry.painted && entry.canvas) {
          const g = entry.canvas.getContext("2d");
          g?.setTransform(1, 0, 0, 1, 0, 0);
          g?.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
          entry.painted = false;
        }
      }
      if (graphics && canvas && painted) {
        graphics.setTransform(1, 0, 0, 1, 0, 0);
        graphics.clearRect(0, 0, canvas.width, canvas.height);
        painted = false;
      }
    }
    function schedule() {
      if (frame === 0 && !disposed && active()) {
        frame = requestAnimationFrame(loop);
      }
    }
    function loop() {
      frame = 0;
      if (!active()) {
        clear();
        return;
      }
      const now = performance.now();
      const dt = Math.min(64, now - lastFrame || 16.7);
      lastFrame = now;
      clear();
      const ratio = window.devicePixelRatio || 1;
      let busy = false;
      for (const entry of painters) {
        if (!entry.awake || entry.owner.stopped) {
          continue;
        }
        const g = entry.canvas ? entry.canvas.getContext("2d") : ensureCanvas();
        if (!g) {
          continue;
        }
        g.setTransform(ratio, 0, 0, ratio, 0, 0);
        g.save();
        let keep = false;
        try {
          keep = entry.fn(g, now, dt) !== false;
        } catch (error) {
          report(entry.owner, error);
        }
        g.restore();
        if (entry.canvas) {
          entry.painted = true;
        } else {
          painted = true;
        }
        entry.awake = keep;
        busy = true;
      }
      if (busy || painted) {
        schedule();
      }
    }
    const PAUSED_ATTRIBUTE = "data-woodfish-paused";
    function onFocusChange() {
      document.documentElement.toggleAttribute(PAUSED_ATTRIBUTE, !active());
      if (active()) {
        lastFrame = performance.now();
        schedule();
      } else {
        if (frame !== 0) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
        clear();
      }
    }
    document.documentElement.toggleAttribute(PAUSED_ATTRIBUTE, !active());
    window.addEventListener("resize", resize);
    window.addEventListener("focus", onFocusChange);
    window.addEventListener("blur", onFocusChange);
    document.addEventListener("visibilitychange", onFocusChange);
    function report(owner, error) {
      owner.errors += 1;
      const text2 = message(error);
      options.log?.(owner.source.id, text2);
      if (owner.errors >= MAX_ERRORS) {
        fail(owner.source.id, `\u8FD0\u884C\u51FA\u9519\uFF1A${text2}`);
      }
    }
    function fail(id, text2) {
      stop(id);
      failures.set(id, text2);
      options.onError?.(id, text2);
    }
    function guard(owner, fn) {
      return (...args) => {
        if (owner.stopped) {
          return;
        }
        try {
          fn(...args);
        } catch (error) {
          report(owner, error);
        }
      };
    }
    function mountCss(source) {
      const variables = effectCssVariables(source.id, source.manifest, source.values);
      styles.upsert(
        `${source.id}-vars`,
        variables.length > 0 ? `:root {
  ${variables.join("\n  ")}
}` : ""
      );
      styles.upsert(`${source.id}-css`, source.css ?? "");
    }
    function effective(source) {
      const style = getComputedStyle(document.documentElement);
      const fromCss = effectValuesFromCss(
        source.id,
        source.manifest,
        (name) => style.getPropertyValue(name)
      );
      const values = { ...source.values, ...fromCss };
      return sameValues(values, source.values) ? source.values : values;
    }
    function overrides(source, values) {
      return values ? Object.keys(values).filter((key2) => values[key2] !== source.values[key2]) : [];
    }
    function unmountCss(id) {
      styles.remove(`${id}-vars`);
      styles.remove(`${id}-css`);
      styles.remove(`${id}-js`);
    }
    function createContext(owner) {
      const { source } = owner;
      return {
        id: source.id,
        host: options.host,
        get params() {
          return owner.values;
        },
        theme,
        rainbow: RAINBOW,
        selectors: options.selectors ?? {},
        lib: options.lib ?? {},
        onInsert: (handler) => owner.handlers.insert.push(guard(owner, handler)),
        onCaret: (handler) => owner.handlers.caret.push(guard(owner, handler)),
        onStreamEnd: (handler) => owner.handlers.streamEnd.push(guard(owner, handler)),
        onTheme: (handler) => owner.handlers.theme.push(guard(owner, handler)),
        painter: (fn, canvas2) => {
          const entry = { fn, canvas: canvas2, awake: false, owner };
          painters.add(entry);
          owner.painters.add(entry);
          return {
            wake: () => {
              if (owner.stopped) {
                return;
              }
              entry.awake = true;
              schedule();
            }
          };
        },
        get layer() {
          return ensureLayer();
        },
        style: (css) => styles.upsert(`${source.id}-js`, css),
        on: (target, type, listener, listenerOptions) => {
          const wrapped = guard(owner, listener);
          target.addEventListener(type, wrapped, listenerOptions);
          owner.cleanups.push(() => target.removeEventListener(type, wrapped, listenerOptions));
        },
        later: (ms, fn) => {
          const timer = globalThis.setTimeout(guard(owner, fn), ms);
          const cancel = () => globalThis.clearTimeout(timer);
          owner.cleanups.push(cancel);
          return cancel;
        },
        simplified: () => reducedMotion() || !active(),
        reducedMotion,
        log: (text2) => options.log?.(source.id, text2)
      };
    }
    function start(source) {
      failures.delete(source.id);
      mountCss(source);
      const owner = {
        source,
        values: effective(source),
        instance: {},
        handlers: { insert: [], caret: [], streamEnd: [], theme: [] },
        painters: /* @__PURE__ */ new Set(),
        cleanups: [],
        errors: 0,
        stopped: false
      };
      const context = createContext(owner);
      running.set(source.id, owner);
      if (!source.factory) {
        return;
      }
      try {
        const module = { exports: {} };
        source.factory(module, module.exports);
        if (typeof module.exports !== "function") {
          throw new Error("effect.js \u9700\u8981 module.exports = function (ctx) { \u2026 }");
        }
        const result = module.exports(context);
        owner.instance = result !== null && typeof result === "object" ? result : {};
      } catch (error) {
        fail(source.id, `\u542F\u52A8\u5931\u8D25\uFF1A${message(error)}`);
      }
    }
    function stop(id) {
      const owner = running.get(id);
      running.delete(id);
      unmountCss(id);
      if (!owner) {
        return;
      }
      owner.stopped = true;
      for (const entry of owner.painters) {
        painters.delete(entry);
      }
      for (const cleanup of owner.cleanups.splice(0)) {
        try {
          cleanup();
        } catch {
        }
      }
      try {
        owner.instance.dispose?.();
      } catch (error) {
        options.log?.(id, `\u505C\u6B62\u65F6\u51FA\u9519\uFF1A${message(error)}`);
      }
      painted = true;
      schedule();
    }
    function update(owner, source) {
      owner.source = source;
      mountCss(source);
      const values = effective(source);
      if (sameValues(owner.values, values)) {
        return;
      }
      owner.values = values;
      if (!owner.instance.update) {
        stop(source.id);
        start(source);
        return;
      }
      try {
        owner.instance.update(values);
      } catch (error) {
        fail(source.id, `\u66F4\u65B0\u53C2\u6570\u5931\u8D25\uFF1A${message(error)}`);
      }
    }
    function applyOne(source) {
      const owner = running.get(source.id);
      const runs = source.manifest.hosts.includes(options.host);
      if (source.error || !runs) {
        if (owner) {
          stop(source.id);
        }
        return;
      }
      if (source.manifest.core) {
        if (source.values.enabled) {
          mountCss(source);
        } else {
          unmountCss(source.id);
        }
        const values = source.values.enabled ? effective(source) : null;
        coreValues.set(source.id, values);
        options.core?.(source.manifest.core, values);
        return;
      }
      if (!source.values.enabled) {
        if (owner) {
          stop(source.id);
        }
        failures.delete(source.id);
        return;
      }
      if (owner && owner.source.hash === source.hash && !failures.has(source.id)) {
        update(owner, source);
        return;
      }
      if (owner) {
        stop(source.id);
      }
      if (failures.has(source.id) && owner === void 0 && sources.get(source.id)?.hash === source.hash) {
        return;
      }
      start(source);
    }
    function owners2() {
      return [...running.values()];
    }
    function recheck() {
      for (const owner of owners2()) {
        update(owner, owner.source);
      }
      for (const source of sources.values()) {
        const previous = coreValues.get(source.id);
        if (!source.manifest.core || !previous) {
          continue;
        }
        const values = effective(source);
        if (!sameValues(previous, values)) {
          coreValues.set(source.id, values);
          options.core?.(source.manifest.core, values);
        }
      }
    }
    return {
      apply(next) {
        if (disposed) {
          return;
        }
        const seen = /* @__PURE__ */ new Set();
        for (const source of next) {
          if (seen.has(source.id)) {
            continue;
          }
          seen.add(source.id);
          const previous = sources.get(source.id);
          if (previous && previous.hash !== source.hash) {
            failures.delete(source.id);
          }
          applyOne(source);
          sources.set(source.id, source);
        }
        for (const [id, source] of [...sources]) {
          if (!seen.has(id)) {
            sources.delete(id);
            failures.delete(id);
            if (source.manifest.core) {
              options.core?.(source.manifest.core, null);
            }
            stop(id);
          }
        }
      },
      preview(id, patch) {
        const source = sources.get(id);
        if (!source || disposed) {
          return null;
        }
        const values = patchEffectValues(source.manifest, source.values, patch);
        const next = { ...source, values };
        if (failures.has(id) && values.enabled !== source.values.enabled) {
          failures.delete(id);
        }
        sources.set(id, next);
        applyOne(next);
        return values;
      },
      insert(event) {
        owners2().forEach((owner) => owner.handlers.insert.forEach((handler) => handler(event)));
      },
      caret(event) {
        owners2().forEach((owner) => owner.handlers.caret.forEach((handler) => handler(event)));
      },
      streamEnd(event) {
        owners2().forEach((owner) => owner.handlers.streamEnd.forEach((handler) => handler(event)));
      },
      themeChanged() {
        themeCache = null;
        recheck();
        owners2().forEach((owner) => owner.handlers.theme.forEach((handler) => handler()));
      },
      setUserCss(css) {
        if (disposed) {
          return;
        }
        if (css.trim() === "") {
          userStyle?.remove();
          userStyle = null;
        } else {
          if (!userStyle) {
            userStyle = document.createElement("style");
            userStyle.setAttribute("data-woodfish-user-css", "");
            for (const [name, value] of Object.entries(options.nodeAttributes ?? {})) {
              userStyle.setAttribute(name, value);
            }
          }
          if (userStyle.textContent !== css) {
            userStyle.textContent = css;
          }
          const parent = document.body ?? document.documentElement;
          if (userStyle.parentNode !== parent) {
            parent.append(userStyle);
          }
        }
        recheck();
      },
      status() {
        return [...sources.values()].filter((source) => source.error || source.manifest.hosts.includes(options.host)).map((source) => {
          const error = source.error ?? failures.get(source.id);
          const values = source.manifest.core ? coreValues.get(source.id) : running.get(source.id)?.values;
          const state = error ? "failed" : source.manifest.core ? "core" : running.has(source.id) ? "running" : "off";
          return {
            id: source.id,
            manifest: source.manifest,
            values: normalizeEffectValues(source.manifest, source.values),
            state,
            ...error ? { error } : {},
            overrides: overrides(source, values)
          };
        }).sort(
          (left, right) => left.manifest.order - right.manifest.order || left.id.localeCompare(right.id)
        );
      },
      dispose() {
        if (disposed) {
          return;
        }
        for (const id of [...running.keys()]) {
          stop(id);
        }
        for (const source of sources.values()) {
          if (source.manifest.core) {
            options.core?.(source.manifest.core, null);
          }
        }
        disposed = true;
        if (frame !== 0) {
          cancelAnimationFrame(frame);
        }
        window.removeEventListener("resize", resize);
        window.removeEventListener("focus", onFocusChange);
        window.removeEventListener("blur", onFocusChange);
        document.removeEventListener("visibilitychange", onFocusChange);
        document.documentElement.removeAttribute(PAUSED_ATTRIBUTE);
        styles.removeAll();
        userStyle?.remove();
        userStyle = null;
        coreValues.clear();
        layer?.remove();
        layer = null;
        canvas = null;
        graphics = null;
        sources.clear();
        failures.clear();
      }
    };
  }

  // upstream/packages/renderer-runtime/src/textEvents.ts
  function clippingAncestors(element) {
    const clippers = [];
    for (let node = element.parentElement; node; node = node.parentElement) {
      if (node === document.body || node === document.documentElement) {
        continue;
      }
      const style = getComputedStyle(node);
      const paint = /paint|strict|content/.test(style.contain);
      const x = paint || style.overflowX !== "visible";
      const y = paint || style.overflowY !== "visible";
      if (x || y) {
        clippers.push({ element: node, x, y });
      }
    }
    return clippers;
  }
  function cutArea(area, box, x = true, y = true) {
    const left = x ? Math.max(area.left, box.left) : area.left;
    const top = y ? Math.max(area.top, box.top) : area.top;
    return {
      left,
      top,
      right: Math.max(left, x ? Math.min(area.right, box.right) : area.right),
      bottom: Math.max(top, y ? Math.min(area.bottom, box.bottom) : area.bottom)
    };
  }
  function visibleArea(clippers) {
    let area = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    for (const { element, x, y } of clippers) {
      area = cutArea(area, element.getBoundingClientRect(), x, y);
    }
    return area;
  }
  function canSee(owner, x, y, area) {
    if (x < area.left || x >= area.right || y < area.top || y >= area.bottom) {
      return false;
    }
    const hit = typeof document.elementFromPoint === "function" ? document.elementFromPoint(x, y) : null;
    return hit === null || owner.contains(hit) || hit.contains(owner);
  }
  var BLOCKS = "p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, pre, dd, dt";
  function lineInArea(x, y, height, area) {
    return area.bottom > area.top && x >= area.left && x < area.right && y < area.bottom && y + height > area.top;
  }
  function lastTextNode(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => node.data.trim().length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
    });
    return walker.lastChild();
  }
  function blockOf(node, root) {
    const parent = node.parentElement;
    const block = parent?.closest(BLOCKS) ?? parent;
    return block && root.contains(block) ? block : root;
  }
  function rectsOf(node, start, end) {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    return [...range.getClientRects()].filter((rect) => rect.width > 0 || rect.height > 0);
  }
  function createRateMeter() {
    let rate = 0;
    let last = 0;
    return (chars) => {
      const now = performance.now();
      const seconds = Math.max(0.016, (now - last) / 1e3);
      rate = last === 0 ? chars / seconds : rate * 0.7 + chars / seconds * 0.3;
      last = now;
      return rate;
    };
  }
  function watchStream(root, sink, options = {}) {
    const measure = createRateMeter();
    const clippers = clippingAncestors(root);
    let last = null;
    let frame = 0;
    let pendingText = false;
    let disposed = false;
    let streaming = false;
    let shown = false;
    function prime() {
      const node = lastTextNode(root);
      last = node ? { node, offset: node.length } : null;
    }
    function hide() {
      if (shown) {
        shown = false;
        sink.caret({ x: 0, y: 0, width: 0, height: 0, source: "ai", visible: false });
      }
    }
    function flush() {
      frame = 0;
      if (disposed) {
        return;
      }
      const node = lastTextNode(root);
      if (!node) {
        hide();
        return;
      }
      const start = last && last.node === node ? Math.min(last.offset, node.length) : 0;
      const appended = pendingText && start < node.length;
      pendingText = false;
      const rects = appended ? rectsOf(node, start, node.length) : rectsOf(node, Math.max(0, node.length - 1), node.length);
      const end = rects[rects.length - 1];
      if (!end) {
        if (root.getClientRects().length === 0) {
          last = { node, offset: node.length };
          hide();
        }
        return;
      }
      last = { node, offset: node.length };
      streaming ||= appended;
      if (!streaming) {
        return;
      }
      const seen = visibleArea(clippers);
      const area = options.cover ? options.cover(seen) : seen;
      const visible = lineInArea(end.right - 1, end.top, end.height, area);
      if (appended) {
        const text2 = node.data.slice(start);
        const rate = measure(text2.length);
        if (visible && canSee(root, end.right - 1, end.top + end.height / 2, area)) {
          sink.insert({
            x: end.right,
            y: end.top,
            height: end.height,
            text: text2,
            source: "ai",
            rate,
            rects,
            block: blockOf(node, root),
            node,
            start
          });
        }
      }
      if (visible || shown) {
        shown = visible;
        sink.caret({
          x: end.right,
          y: end.top,
          width: 0,
          height: end.height,
          source: "ai",
          visible,
          owner: root,
          clip: area
        });
      }
    }
    function schedule(text2) {
      pendingText ||= text2;
      if (frame === 0 && !disposed) {
        frame = requestAnimationFrame(flush);
      }
    }
    const observer = new MutationObserver(() => schedule(true));
    observer.observe(root, { subtree: true, childList: true, characterData: true });
    prime();
    return {
      reposition: () => schedule(false),
      dispose() {
        disposed = true;
        observer.disconnect();
        if (frame !== 0) {
          cancelAnimationFrame(frame);
        }
      }
    };
  }
  function selectionCaretRect(editor2) {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return null;
    }
    const range = selection.getRangeAt(0);
    if (!editor2.contains(range.startContainer)) {
      return null;
    }
    const rect = range.getClientRects()[0];
    if (rect && rect.height > 0) {
      return { x: rect.left, y: rect.top, height: rect.height };
    }
    const node = range.startContainer;
    const line = node instanceof Element ? node : node.parentElement;
    if (!line) {
      return null;
    }
    const placeholder = line.matches("br") ? line : line.querySelector("br");
    const lineBox = placeholder?.parentElement ?? line;
    const box = lineBox.getBoundingClientRect();
    const style = getComputedStyle(lineBox);
    const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.4;
    return {
      x: box.left + Number.parseFloat(style.paddingLeft || "0"),
      y: box.top + Number.parseFloat(style.paddingTop || "0"),
      height: lineHeight
    };
  }
  var INSERTING_INPUT = /* @__PURE__ */ new Set([
    "insertText",
    "insertReplacementText",
    "insertCompositionText",
    "insertFromPaste",
    "insertFromDrop",
    "insertParagraph",
    "insertLineBreak"
  ]);
  function watchEditableTyping(selector, sink) {
    const measure = createRateMeter();
    let frame = 0;
    let typed = "";
    let lastKey = "";
    let clipped = null;
    const resizes = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
    function hide() {
      if (lastKey) {
        lastKey = "";
        sink.caret({ x: 0, y: 0, width: 0, height: 0, source: "user", visible: false });
      }
    }
    function flush() {
      frame = 0;
      if (!document.hasFocus() || document.visibilityState === "hidden") {
        hide();
        typed = "";
        return;
      }
      const editor2 = document.activeElement?.closest(selector) ?? null;
      const rect = editor2 ? selectionCaretRect(editor2) : null;
      if (!editor2 || !rect) {
        hide();
        typed = "";
        return;
      }
      if (clipped?.editor !== editor2) {
        lastKey = "";
        clipped = { editor: editor2, clippers: clippingAncestors(editor2) };
        resizes?.disconnect();
        const box = clipped.clippers[0]?.element;
        if (box) {
          resizes?.observe(box);
        }
      }
      const area = visibleArea(clipped.clippers);
      const visible = lineInArea(rect.x, rect.y, rect.height, area);
      if (typed) {
        const text2 = typed;
        typed = "";
        const rate = measure(text2.length);
        const node = document.getSelection()?.anchorNode ?? null;
        if (visible && canSee(editor2, rect.x, rect.y + rect.height / 2, area)) {
          sink.insert({
            x: rect.x,
            y: rect.y,
            height: rect.height,
            text: text2,
            source: "user",
            rate,
            rects: [],
            block: node instanceof Element ? node : node?.parentElement ?? null,
            node: null,
            start: 0
          });
        }
      }
      if (!visible) {
        hide();
        return;
      }
      const key2 = [rect.x, rect.y, rect.height, area.left, area.top, area.right, area.bottom].map(Math.round).join();
      if (key2 !== lastKey) {
        lastKey = key2;
        sink.caret({
          x: rect.x,
          y: rect.y,
          width: 0,
          height: rect.height,
          source: "user",
          visible: true,
          owner: editor2,
          clip: area
        });
      }
    }
    function schedule() {
      if (frame === 0) {
        frame = requestAnimationFrame(flush);
      }
    }
    function onInput(event) {
      const input = event;
      if (!(input.target instanceof Element) || !input.target.closest(selector)) {
        return;
      }
      if (!INSERTING_INPUT.has(input.inputType) || input.isComposing) {
        schedule();
        return;
      }
      typed += input.data ?? (input.inputType.startsWith("insertFrom") ? " " : "\n");
      schedule();
    }
    function onCompositionEnd(event) {
      const composition = event;
      if (composition.target instanceof Element && composition.target.closest(selector)) {
        typed += composition.data ?? "";
        schedule();
      }
    }
    const listeners = [
      [document, "input", onInput],
      [document, "compositionend", onCompositionEnd],
      [document, "selectionchange", schedule],
      [document, "focusin", schedule],
      [document, "focusout", schedule],
      [window, "focus", schedule],
      [window, "blur", schedule],
      [document, "visibilitychange", schedule],
      [document, "scroll", schedule],
      [window, "resize", schedule]
    ];
    for (const [target, type, listener] of listeners) {
      target.addEventListener(type, listener, { capture: true, passive: true });
    }
    schedule();
    return () => {
      for (const [target, type, listener] of listeners) {
        target.removeEventListener(type, listener, { capture: true });
      }
      resizes?.disconnect();
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
    };
  }

  // upstream/apps/chatgpt-app/src/selectors.ts
  var COMPOSER_ROOT = "[data-codex-composer-root]";
  var NEW_CHAT = '[data-composer-utility-bar-variant="home"]';
  var composerSurfaceOf = (variant) => [
    `${COMPOSER_ROOT} ${variant}:not(${NEW_CHAT})`,
    `${COMPOSER_ROOT} ${variant}${NEW_CHAT} [data-composer-body]`
  ];
  var floatingSurfaces = [
    '[popover] > [data-anchor-positioning="native"]',
    '[popover][data-anchor-positioning="native"]',
    "[data-radix-popper-content-wrapper] > *",
    'div[role="tooltip"][id]',
    '[data-slot="popover-content"]',
    '[role="menu"]',
    '[role="listbox"]',
    '[role="dialog"]',
    "[data-sonner-toast]",
    '[data-composer-overlay-floating-ui="true"] > *'
  ].join(", ");
  var CODEX_SELECTORS = {
    appShell: {
      selectors: ["[data-app-shell-main-surface]"],
      alwaysPresent: true,
      description: "\u4E3B\u754C\u9762"
    },
    page: {
      // Pages other than the thread (Settings, plugins) paint the surface on this container.
      selectors: ["[data-codex-history-swipe-page] > .electron\\:bg-surface"],
      alwaysPresent: false,
      description: "\u8BBE\u7F6E\u7B49\u9875\u9762"
    },
    sidebar: {
      selectors: ["[data-sidebar-navigation-root]"],
      alwaysPresent: false,
      description: "\u4FA7\u680F"
    },
    sidebarThreadRow: {
      selectors: ["[data-app-action-sidebar-thread-row]"],
      alwaysPresent: false,
      description: "\u4FA7\u680F\u4F1A\u8BDD"
    },
    sidebarActiveThread: {
      selectors: ['[data-app-action-sidebar-thread-active="true"]'],
      alwaysPresent: false,
      description: "\u5F53\u524D\u4F1A\u8BDD"
    },
    sidebarRunningThread: {
      // Codex shows a spinner (Tailwind `motion-safe:animate-spin`) while a thread runs.
      selectors: ["[data-app-action-sidebar-thread-row]:has(.motion-safe\\:animate-spin)"],
      alwaysPresent: false,
      description: "\u8FD0\u884C\u4E2D\u7684\u4F1A\u8BDD"
    },
    // The composer is absent on settings, plugin and other non-chat pages.
    composer: {
      selectors: ["[data-codex-composer-root]"],
      alwaysPresent: false,
      description: "\u8F93\u5165\u6846"
    },
    composerSurface: {
      selectors: [
        `${COMPOSER_ROOT} [data-composer-surface-variant]:not(${NEW_CHAT})`,
        `${COMPOSER_ROOT} ${NEW_CHAT} [data-composer-body]`
      ],
      alwaysPresent: false,
      description: "\u8F93\u5165\u6846\u5916\u6846\uFF08Codex \u753B\u80CC\u666F\u548C\u5706\u89D2\u7684\u90A3\u4E00\u5C42\uFF09"
    },
    composerEditor: {
      selectors: ['[data-codex-composer-root] [contenteditable="true"]'],
      alwaysPresent: false,
      description: "\u8F93\u5165\u6846\u7F16\u8F91\u533A"
    },
    composerPrimaryButton: {
      // Tailwind utility generated from the theme variable, not a hashed module class.
      selectors: ["[data-codex-composer-root] .bg-composer-primary"],
      alwaysPresent: false,
      description: "\u53D1\u9001\u6309\u94AE"
    },
    timeline: {
      selectors: ["[data-app-action-timeline-scroll]"],
      alwaysPresent: false,
      description: "\u5BF9\u8BDD\u5185\u5BB9"
    },
    userMessage: {
      selectors: ["[data-user-message-bubble]"],
      alwaysPresent: false,
      description: "\u7528\u6237\u6D88\u606F"
    },
    assistantMarkdown: {
      selectors: ['[data-markdown-text-style="assistant-message"]'],
      alwaysPresent: false,
      description: "\u52A9\u624B\u56DE\u590D"
    },
    codeBlockSource: {
      selectors: ['[data-code-block-source="true"]'],
      alwaysPresent: false,
      description: "\u4EE3\u7801\u5757"
    },
    codeToken: {
      selectors: ['[data-code-block-source="true"] code span'],
      alwaysPresent: false,
      description: "\u4EE3\u7801 token"
    },
    diff: {
      selectors: ["diffs-container"],
      alwaysPresent: false,
      description: "diff \u89C6\u56FE"
    },
    activeTab: {
      // Tabs of the right-hand panel (Changes, files, browser).
      selectors: ['[data-app-shell-tab-controller] [role="tab"][aria-selected="true"]'],
      alwaysPresent: false,
      description: "\u5F53\u524D\u6807\u7B7E\u9875"
    },
    revealTarget: {
      selectors: [
        "[data-app-action-sidebar-thread-row]",
        "[data-app-action-sidebar-project-row]",
        "nav[data-app-navigation-rail] button",
        '[role="menuitem"]',
        '[role="option"]',
        '[role="tab"]'
      ],
      alwaysPresent: false,
      description: "\u8DDF\u968F\u6307\u9488\u67D4\u5149\u7684\u5217\u8868\u9879\u4E0E\u6309\u94AE"
    },
    composerMenuHeader: {
      // Section headers of the / and @ menu: opaque strips inside the floating panel.
      selectors: [
        '[data-composer-overlay-floating-ui="true"] [data-mention-section-id] > :not([data-mention-section-items])'
      ],
      alwaysPresent: false,
      description: "\u8F93\u5165\u6846\u83DC\u5355\u5206\u7EC4\u6807\u9898"
    },
    // Codex's own fades and the strip behind the composer, which the window background
    // turns into blur-only bands (content scrolls under them).
    mainTopFade: {
      selectors: ['[data-app-shell-main-content-top-fade] > [aria-hidden="true"]'],
      alwaysPresent: false,
      description: "\u4E3B\u533A\u9876\u90E8\u6E10\u9690"
    },
    threadFooter: {
      selectors: ["[data-thread-scroll-footer] > .bg-surface.pointer-events-none"],
      alwaysPresent: false,
      description: "\u8F93\u5165\u6846\u540E\u65B9\u7684\u5E95\u6761"
    },
    composerLayout: {
      selectors: [
        `${COMPOSER_ROOT} [data-composer-surface-variant="default"]`,
        `${COMPOSER_ROOT} [data-composer-surface-variant="opaque"]`
      ],
      alwaysPresent: false,
      description: "\u8F93\u5165\u6846\u5E95\u677F\uFF08Codex \u7684\u989C\u8272\u53D8\u91CF\u6240\u5728\u7684\u5C42\uFF09"
    },
    composerFill: {
      selectors: [
        ...composerSurfaceOf('[data-composer-surface-variant="default"]'),
        ...composerSurfaceOf('[data-composer-surface-variant="opaque"]')
      ],
      alwaysPresent: false,
      description: "\u8F93\u5165\u6846\u5E95\u677F\u4E0A\u7684\u7A97\u53E3\u80CC\u666F"
    },
    floatingLayer: {
      // Positioning wrappers can also carry a dialog role or popover slot.
      selectors: [
        `:is(${floatingSurfaces}):not([popover]:has(> [data-anchor-positioning="native"]), [data-radix-popper-content-wrapper], [data-composer-overlay-floating-ui="true"])`
      ],
      alwaysPresent: false,
      description: "\u83DC\u5355\u4E0E\u6D6E\u5C42"
    }
  };
  function selectorOf(group) {
    return CODEX_SELECTORS[group].selectors.join(", ");
  }
  var CODE_TOKEN_SELECTOR = selectorOf("codeToken");
  var CODE_ROOT_SELECTOR = selectorOf("codeBlockSource");
  var BODY_TEXT_SELECTOR = [
    "p",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "td",
    "th"
  ].map((tag) => `[data-markdown-text-style="assistant-message"] ${tag}`).join(", ");
  var BODY_ROOT_SELECTOR = selectorOf("assistantMarkdown");

  // upstream/apps/chatgpt-app/src/renderer/caretLayer.ts
  var owners = /* @__PURE__ */ new WeakMap();
  function placeCaretLayer(layer, caret2) {
    const owner = caret2.owner;
    if (owner && (owners.get(layer) !== owner || layer.parentNode !== owner.parentNode)) {
      if (caret2.source === "ai") {
        owner.before(layer);
      } else {
        owner.after(layer);
      }
      owners.set(layer, owner);
      layer.setAttribute("aria-hidden", "true");
      layer.setAttribute("inert", "");
      layer.style.cssText = "position:absolute;inset:auto;width:0;height:0;min-height:0;pointer-events:none;user-select:none;";
    }
    const { left, top } = layer.getBoundingClientRect();
    const r = caret2.clip;
    layer.style.clipPath = r ? `polygon(${r.left - left}px ${r.top - top}px,${r.right - left}px ${r.top - top}px,${r.right - left}px ${r.bottom - top}px,${r.left - left}px ${r.bottom - top}px)` : "";
    return { x: caret2.x - left, y: caret2.y - top };
  }

  // upstream/apps/chatgpt-app/src/renderer/effects.ts
  function joined(group) {
    return CODEX_SELECTORS[group].selectors.join(", ");
  }
  var CODEX_EFFECT_SELECTORS = Object.freeze({
    composer: joined("composer"),
    composerSurface: joined("composerSurface"),
    composerEditor: joined("composerEditor"),
    composerPrimaryButton: joined("composerPrimaryButton"),
    composerMenuHeader: joined("composerMenuHeader"),
    editorRoot: joined("composer"),
    threadRow: joined("sidebarThreadRow"),
    activeThread: joined("sidebarActiveThread"),
    runningThread: joined("sidebarRunningThread"),
    assistantMarkdown: joined("assistantMarkdown"),
    userMessage: joined("userMessage"),
    bodyText: BODY_TEXT_SELECTOR,
    activeTab: joined("activeTab"),
    floatingLayer: joined("floatingLayer"),
    revealTarget: joined("revealTarget"),
    timeline: joined("timeline")
  });
  var CODEX_EFFECT_LIB = Object.freeze({
    placeCaretLayer,
    startReveal,
    mountAcrylicFilter,
    acrylicFilterId: ACRYLIC_FILTER_ID,
    noiseDataUri: buildNoiseDataUri
  });
  function findStreamingReply() {
    const running = `${CODEX_SELECTORS.sidebarRunningThread.selectors[0]}${CODEX_SELECTORS.sidebarActiveThread.selectors[0]}`;
    if (!document.querySelector(running)) {
      return null;
    }
    const thread = [...document.querySelectorAll(joined("timeline"))].find(
      (timeline) => timeline.getClientRects().length > 0
    );
    if (!thread) {
      return null;
    }
    const replies = thread.querySelectorAll(joined("assistantMarkdown"));
    const users = thread.querySelectorAll(joined("userMessage"));
    const reply = replies[replies.length - 1] ?? null;
    const user = users[users.length - 1] ?? null;
    const afterUser = reply !== null && (user === null || (user.compareDocumentPosition(reply) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
    return afterUser ? reply : null;
  }

  // reply-particles.js
  var chatTurn = '[data-chatgpt-conversation-selection-target] [data-talvt-turn-state="in_progress"]';
  var chatReply = '[data-markdown-text-style="assistant-message"]';
  var codexTimeline = "[data-app-action-timeline-scroll]";
  var codexComposerCover = "[data-thread-scroll-footer] > .bg-surface.pointer-events-none";
  function findChatGptReply() {
    const turns = document.querySelectorAll(chatTurn);
    for (let i = turns.length - 1; i >= 0; i--) {
      const turn = turns[i];
      if (turn.closest('[inert], [aria-hidden="true"]') || !turn.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
      const replies = turn.querySelectorAll(chatReply);
      for (let j = replies.length - 1; j >= 0; j--) {
        const reply = replies[j];
        if (!reply.closest('[aria-hidden="true"], [hidden]')) return reply;
      }
    }
    return null;
  }
  function trackReplyParticles(host) {
    let reply = null;
    let watcher = null;
    let frame = 0;
    function sync() {
      frame = 0;
      const native = findChatGptReply();
      const codex = native ? null : findStreamingReply();
      const next = native ?? (codex?.closest("[data-chatgpt-conversation-selection-target]") ? null : codex);
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
        }
      });
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(sync);
    }
    const observer = new MutationObserver((records) => {
      if (records.some((record) => !reply?.contains(record.target))) schedule();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-talvt-turn-state", "data-app-action-sidebar-thread-active", "data-sidebar-indicator"]
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

  // renderer.js
  var import_effect = __toESM(require_effect());

  // upstream/packages/effects/builtin/caret/effect.json
  var effect_default = {
    name: "\u8F93\u5165\u6846\u5149\u6807",
    description: "Codex \u8F93\u5165\u6846\u91CC\u7684\u5149\u6807\u6362\u6210\u4E00\u6839 6px \u5BBD\u3001\u4E0D\u95EA\u70C1\u3001\u5E73\u6ED1\u79FB\u52A8\u3001Woodfish \u5F69\u8679\u6162\u6162\u6D41\u52A8\u7684\u5149\u6807\uFF0C\u548C VS Code \u91CC Woodfish \u7684\u5149\u6807\u4E00\u6837\u3002",
    version: 6,
    hosts: ["codex"],
    enabled: true,
    order: 5,
    params: {
      width: {
        type: "number",
        default: 6,
        min: 1,
        max: 16,
        step: 0.5,
        unit: "px",
        label: "\u5149\u6807\u5BBD\u5EA6",
        description: "VS Code \u7684 editor.cursorWidth\uFF08\u9ED8\u8BA4 6\uFF09"
      },
      blinking: {
        type: "select",
        default: "solid",
        options: [
          { value: "solid", label: "\u4E0D\u95EA\u70C1" },
          { value: "blink", label: "\u95EA\u70C1" },
          { value: "smooth", label: "\u67D4\u548C\u95EA\u70C1" },
          { value: "phase", label: "\u6E10\u9690\u6E10\u73B0" },
          { value: "expand", label: "\u4F38\u7F29" }
        ],
        label: "\u95EA\u70C1\u65B9\u5F0F",
        description: "VS Code \u7684 editor.cursorBlinking\uFF08\u9ED8\u8BA4 solid\uFF09\uFF1B\u6253\u5B57\u65F6\u603B\u662F\u5E38\u4EAE"
      },
      smoothCaretAnimation: {
        type: "select",
        default: "on",
        options: [
          { value: "on", label: "\u603B\u662F\u5E73\u6ED1" },
          { value: "explicit", label: "\u53EA\u5728\u70B9\u51FB\u548C\u65B9\u5411\u952E\u79FB\u52A8\u65F6" },
          { value: "off", label: "\u5173" }
        ],
        label: "\u5E73\u6ED1\u79FB\u52A8",
        description: "VS Code \u7684 editor.cursorSmoothCaretAnimation\uFF08\u9ED8\u8BA4 on\uFF09\uFF0C\u79FB\u52A8\u7528 80 ms"
      },
      colors: {
        type: "select",
        default: "auto",
        options: [
          { value: "auto", label: "\u8DDF VS Code \u4E00\u6837" },
          { value: "rainbow", label: "Woodfish \u5F69\u8679" },
          { value: "theme", label: "\u4E3B\u9898\u8272" }
        ],
        label: "\u989C\u8272",
        description: "\u8DDF VS Code \u4E00\u6837\uFF1A\u4E3B\u9898\u81EA\u5E26\u5149\u6807\u8272\u65F6\u7528\u4E3B\u9898\u7684\uFF0C\u5426\u5219\u7528 Woodfish \u5F69\u8679\uFF08Woodfish Dark \u662F\u5F69\u8679\uFF09"
      },
      flowSeconds: {
        type: "number",
        default: 8,
        min: 1,
        max: 60,
        step: 0.5,
        unit: "s",
        label: "\u53D8\u8272\u5468\u671F",
        description: "woodfishTheme.cursor.animationDuration\uFF08\u9ED8\u8BA4 8 \u79D2\uFF09"
      },
      radius: {
        type: "number",
        default: 2,
        min: 0,
        max: 8,
        step: 0.5,
        unit: "px",
        label: "\u5706\u89D2",
        description: "woodfishTheme.cursor.borderRadius\uFF08\u9ED8\u8BA4 2\uFF09"
      },
      glow: {
        type: "number",
        default: 0,
        min: 0,
        max: 1,
        step: 0.05,
        label: "\u53D1\u5149",
        description: "\u5149\u6807\u5916\u7684\u4E00\u5708\u67D4\u5149\uFF1B\u9ED8\u8BA4 0\uFF08\u5173\u95ED\uFF09"
      }
    }
  };

  // renderer.js
  var import_effect3 = __toESM(require_effect2());

  // upstream/packages/effects/builtin/typing-particles/effect.json
  var effect_default2 = {
    name: "\u6253\u5B57\u7C92\u5B50",
    description: "\u63D2\u5165\u6587\u5B57\u65F6\uFF0C\u4ECE\u5149\u6807\u5904\u8FF8\u51FA\u4E00\u7C07\u5149\u70B9\uFF08\u50CF VS Code \u7684 Power Mode\uFF0C\u6CA1\u6709\u9707\u52A8\u548C\u8FDE\u51FB\u8BA1\u6570\uFF09\uFF1B\u4F60\u6253\u5B57\u548C AI \u5410\u5B57\u90FD\u4F1A\u89E6\u53D1\u3002",
    version: 2,
    hosts: ["codex", "vscode"],
    enabled: true,
    order: 30,
    params: {
      count: {
        type: "number",
        default: 8,
        min: 1,
        max: 40,
        step: 1,
        label: "\u6BCF\u6B21\u7C92\u5B50\u6570",
        description: "\u6BCF\u63D2\u5165\u4E00\u6B21\u6587\u5B57\u8FF8\u51FA\u591A\u5C11\u9897"
      },
      size: {
        type: "number",
        default: 2.2,
        min: 0.5,
        max: 8,
        step: 0.1,
        unit: "px",
        label: "\u7C92\u5B50\u5927\u5C0F",
        description: "\u5149\u70B9\u534A\u5F84"
      },
      speed: {
        type: "number",
        default: 170,
        min: 20,
        max: 600,
        step: 10,
        label: "\u8FF8\u51FA\u901F\u5EA6",
        description: "\u521D\u901F\u5EA6\uFF08\u50CF\u7D20/\u79D2\uFF09\uFF0C\u8D8A\u5927\u98DE\u5F97\u8D8A\u8FDC"
      },
      spread: {
        type: "number",
        default: 150,
        min: 10,
        max: 360,
        step: 5,
        unit: "deg",
        label: "\u6563\u5F00\u89D2\u5EA6",
        description: "\u4EE5\u6B63\u4E0A\u65B9\u4E3A\u4E2D\u5FC3\u7684\u6247\u5F62\u89D2\u5EA6\uFF0C360 \u662F\u56DB\u9762\u516B\u65B9"
      },
      gravity: {
        type: "number",
        default: 450,
        min: -400,
        max: 1500,
        step: 10,
        label: "\u91CD\u529B",
        description: "\u5411\u4E0B\u7684\u52A0\u901F\u5EA6\uFF08\u50CF\u7D20/\u79D2\xB2\uFF09\uFF0C\u8D1F\u6570\u4F1A\u5F80\u4E0A\u98D8"
      },
      life: {
        type: "number",
        default: 650,
        min: 100,
        max: 2e3,
        step: 50,
        unit: "ms",
        label: "\u5B58\u6D3B\u65F6\u95F4",
        description: "\u6BCF\u9897\u7C92\u5B50\u4ECE\u51FA\u73B0\u5230\u6D88\u5931\u7684\u65F6\u95F4"
      },
      colors: {
        type: "select",
        default: "theme",
        options: [
          { value: "theme", label: "\u4E3B\u9898\u6E10\u53D8\u8272" },
          { value: "rainbow", label: "Woodfish \u5F69\u8679" },
          { value: "single", label: "\u5355\u8272" }
        ],
        label: "\u989C\u8272",
        description: "\u4E3B\u9898\u6E10\u53D8\u8272\u53D6\u5F53\u524D\u4E3B\u9898\u7684\u5149\u6807\u8272\uFF1B\u5355\u8272\u7528\u4E0B\u9762\u7684\u989C\u8272"
      },
      color: {
        type: "color",
        default: "#ffffff",
        label: "\u5355\u8272\u989C\u8272",
        description: "\u989C\u8272\u9009\u201C\u5355\u8272\u201D\u65F6\u7528"
      },
      sources: {
        type: "select",
        default: "all",
        options: [
          { value: "all", label: "\u4F60\u6253\u5B57\u548C AI \u5410\u5B57" },
          { value: "user", label: "\u53EA\u5728\u4F60\u6253\u5B57\u65F6" },
          { value: "ai", label: "\u53EA\u5728 AI \u5410\u5B57\u65F6" }
        ],
        label: "\u8C01\u89E6\u53D1",
        description: "Codex \u91CC AI \u6D41\u5F0F\u8F93\u51FA\u4E5F\u7B97\u201C\u6253\u5B57\u201D"
      },
      shake: {
        type: "boolean",
        default: false,
        label: "\u9707\u52A8",
        description: "\u6253\u5B57\u65F6\u7F16\u8F91\u533A\u8F7B\u8F7B\u4E00\u6296\uFF08\u9ED8\u8BA4\u5173\u95ED\uFF09"
      }
    }
  };

  // composer-caret.js
  function fitComposerCaret(caret2) {
    if (!caret2.visible || !caret2.owner) return caret2;
    const anchor = document.getSelection()?.anchorNode;
    const line = anchor instanceof Element ? anchor : anchor?.parentElement;
    const text2 = line && caret2.owner.contains(line) ? line : caret2.owner;
    const style = getComputedStyle(text2);
    const textZoom = text2.currentCSSZoom || 1;
    const lineHeight = Number.parseFloat(style.lineHeight) || 0;
    const height = Math.max(caret2.height, lineHeight * textZoom) * 0.9;
    const placeholderBreak = text2.matches("[data-placeholder]") && !text2.textContent && caret2.owner.closest('[data-composer-input-layout="single-line"]') ? text2.querySelector(":scope > br")?.getBoundingClientRect() : null;
    const lineCenter = placeholderBreak?.height ? placeholderBreak.top + placeholderBreak.height / 2 : caret2.y + caret2.height / 2;
    let y = lineCenter - height / 2;
    const clip = caret2.clip;
    if (clip && caret2.y >= clip.top && caret2.y + caret2.height <= clip.bottom && height <= clip.bottom - clip.top) {
      y = Math.max(clip.top, Math.min(y, clip.bottom - height));
    }
    const layerZoom = caret2.owner.parentElement?.currentCSSZoom || 1;
    return { ...caret2, y, height: height / layerZoom };
  }
  function placeComposerCaretLayer(layer, caret2) {
    const owner = caret2.owner;
    if (owner && layer.previousElementSibling !== owner) {
      owner.after(layer);
      layer.setAttribute("aria-hidden", "true");
      layer.setAttribute("inert", "");
      layer.style.cssText = "position:absolute;inset:auto;width:0;height:0!important;min-height:0;overflow:visible!important;pointer-events:none;user-select:none;";
    }
    const { left, top } = layer.getBoundingClientRect();
    const zoom = layer.currentCSSZoom || 1;
    const x = (value) => (value - left) / zoom;
    const y = (value) => (value - top) / zoom;
    const clip = caret2.clip;
    layer.style.clipPath = clip ? `polygon(${x(clip.left)}px ${y(clip.top)}px, ${x(clip.right)}px ${y(clip.top)}px, ${x(clip.right)}px ${y(clip.bottom)}px, ${x(clip.left)}px ${y(clip.bottom)}px)` : "";
    return { x: x(caret2.x), y: y(caret2.y) };
  }

  // renderer.js
  var key = "__codexTypingEffects";
  var editor = ':is([data-codex-composer-root] [contenteditable="true"], [data-composer-input] [data-composer-markdown][contenteditable="true"])';
  if (!window[key] && document.querySelector("[data-app-shell-frame]")) {
    const root = document.documentElement;
    const host = startEffectHost({
      host: "codex",
      idPrefix: "codex-typing-effects",
      nodeAttributes: { "data-codex-typing-effects": "" },
      selectors: { composerEditor: editor, editorRoot: "[data-codex-composer-root]" },
      lib: { placeCaretLayer: placeComposerCaretLayer },
      theme: () => ({
        mode: root.getAttribute("data-theme") === "light" ? "light" : "dark",
        stops: ["#ffd0e8", "#ff8fc4", "#f94e9e", "#dc397e"],
        accent: "",
        accent2: "",
        background: "",
        foreground: ""
      }),
      reducedMotion: () => root.getAttribute("data-reduced-motion") === "true",
      onError: (id, message2) => console.warn("[Codex Typing Effects]", id, message2)
    });
    host.apply([
      ["caret", effect_default, import_effect.default, { colors: "theme", smoothCaretAnimation: "off" }],
      ["typing-particles", effect_default2, import_effect3.default, { colors: "rainbow" }]
    ].map(([id, spec, effect, values]) => {
      const manifest = normalizeEffectManifest(spec);
      return {
        id,
        manifest,
        values: normalizeEffectValues(manifest, values),
        hash: id,
        factory: (module) => {
          module.exports = effect;
        }
      };
    }));
    const stopTyping = watchEditableTyping(editor, {
      insert: host.insert,
      caret: (event) => host.caret(fitComposerCaret(event))
    });
    const stopStreaming = trackReplyParticles(host);
    const theme = new MutationObserver(() => host.themeChanged());
    theme.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    window[key] = {
      status: () => host.status().map(({ id, state, values }) => ({ id, state, colors: values.colors })),
      dispose() {
        theme.disconnect();
        stopTyping();
        stopStreaming();
        host.dispose();
        delete window[key];
      }
    };
  }
})();
