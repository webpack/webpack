# Resource hints

This example gathers every way to configure `<link rel="preload">` /
`<link rel="prefetch">` / `<link rel="modulepreload">` emission in one place.
Each scenario is a separate compiler in the `webpack.config.js` array; pick
the one that fits your app and copy from it.

Two surfaces are involved:

- `output.resourceHints` — the emission config. It accepts the **initial chunk
  graph** shorthand directly (`true` / `"prefetch"` / `"none"` /
  `HtmlResourceHint[]` / a function — equivalent to `{ initial: … }`) **or** the
  full object `{ initial, urlHints, preconnect, modulePreloadPolyfill, manifest }`.
  Hints land in an HTML entry's `<head>` (or `stats.entrypoints[name].resourceHints`
  / the `manifest` file for SSR). `initial` **defaults on for ESM output**
  (`output.module`) — like Vite, since native `import()` would otherwise
  waterfall; classic output stays opt-in.
- `module.parser.<type>.urlHints` — controls per-**URL-referenced-asset**
  defaults (fonts, images, workers) for `new URL(...)`, CSS `url(...)`,
  HTML `<img src>`, etc. Per-URL `webpackPreload` / `webpackPrefetch` magic
  comments still win. `output.resourceHints.urlHints` is a project-wide shorthand
  that seeds the same list under every parser at once.

## Scenarios

1. **auto** — `output.resourceHints: true`. Auto-emit
   `<link rel="modulepreload">` (ESM) or `<link rel="preload" as="script">`
   (classic) for the HTML entry's initial dependency chunks.
2. **prefetch** — `output.resourceHints: "prefetch"`. Same as above but with
   `<link rel="prefetch">` (idle-time hint).
3. **custom-array** — `output.resourceHints: [{...}, ...]`. Supply your own
   `<link>` list (preconnect, custom font, chunk/entry references).
4. **callback** — `output.resourceHints: fn`. One hook that receives the auto
   `defaultHints` plus `{ entryName, entrypoint, hostType, compilation }` and
   returns the final list. Each hint carries `hostChunks` (the referencing chunk
   names — Vite's `hostId`) so you can rewrite per origin chunk. Replaces both
   the old `chunks: fn` and `resolveDependencies` hooks; runs for HTML pages
   (`hostType === "html"`) and JS-only entries (`hostType === "js"`).
5. **url-hints** — `module.parser.javascript.urlHints`. Rule-based
   `preload`/`prefetch` defaults for JS `new URL(...)` references. Same
   shape works under `parser.css.urlHints` (CSS `url(...)`) and
   `parser.html.urlHints` (HTML `<img src>` / `<link href>`).
6. **url-hints-scoped** — `module.rules[].parser.urlHints`. Because parser
   options are scope-aware, a rule can narrow `urlHints` to a subtree
   (e.g. critical routes upgrade `prefetch` → `preload`).
7. **ssr** — `output.resourceHints.manifest` + `output.resourceHints`. JS-only
   build; hints are written to a JSON file (`{ [entry]: descriptors }`) and are
   also on `stats.entrypoints[name].resourceHints`. The server renders them into
   the initial HTML shell.
8. **font-preload** — `module.parser.css.fontPreload: true`. Auto-emit
   `<link rel="preload" as="font">` for the primary `@font-face` `src` in the
   initial CSS. Only the first url per `@font-face` is preloaded.
9. **none** — `output.resourceHints: "none"`. Hard off switch: no `<link>`
   anywhere and empty stats / manifest. (`false` only disables the auto chunk
   hints; URL-asset hints keep firing.)
10. **url-hints-global** — `output.resourceHints.urlHints`. Project-wide shorthand for the
    same `urlHints` list under every parser (JS / CSS / HTML). Parser-scoped
    rules and magic comments still override it.
11. **async-css-preload** — `module.parser.javascript.dynamicImportCssPreload`.
    Auto `<link rel="preload" as="style">` for a dynamically imported chunk's
    CSS (parallel with the chunk; the JS itself is not preloaded).
12. **auto-preconnect** — `output.resourceHints.preconnect`. Emit
    `<link rel="preconnect">` for a cross-origin `output.publicPath` origin
    (the CDN serving your bundles / assets).
13. **object-form** — every knob in one object: `{ initial, urlHints,
    preconnect, modulePreloadPolyfill, manifest }`.
14. **csp-no-polyfill** — `modulePreloadPolyfill: false`. The polyfill default
    is derived from `output.environment.modulePreload`; opt out under a strict
    CSP that forbids inline scripts.
15. **async-js-css-preload** — `module.parser.javascript.dynamicImportPreload`.
    Couples JS **and** CSS of an async chunk (Vite parity) — contrast with
    scenario 11's CSS-only `dynamicImportCssPreload`.
16. **esm-default** — nothing set. ESM output (`output.module`) enables
    `initial` by default, so initial chunks get `<link rel="modulepreload">`
    with no `resourceHints` config.

# webpack.config.js

```javascript
"use strict";

/*
 * Every scenario is its own compilation so each config below is small and
 * self-contained. Pick whichever pattern fits your app.
 */

const path = require("path");

/**
 * @param {string} name compilation name
 * @returns {string} per-scenario output directory
 */
const distFor = (name) => path.join(__dirname, "dist", name);

/** @type {import("webpack").Configuration[]} */
module.exports = [
	/*
	 * 1. AUTO — the simplest opt-in.
	 * `output.resourceHints: true` auto-emits `<link rel="modulepreload">` (ESM
	 * output) or `<link rel="preload" as="script">` (classic) for each of the
	 * HTML entry's initial dependency chunks (runtime, vendor, split). The entry
	 * chunk itself is skipped — it's already the `<script src>`.
	 */
	{
		name: "auto",
		mode: "production",
		entry: { home: { import: "./src/routes/home.js", html: true } },
		output: {
			path: distFor("auto"),
			filename: "[name].[contenthash:8].js",
			chunkFilename: "[name].[contenthash:8].chunk.js",
			module: true,
			resourceHints: true
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { html: true, outputModule: true }
	},

	/*
	 * 2. PREFETCH — idle-time hint instead of preload.
	 * Use for chunks that aren't needed for the first paint but the browser
	 * should download when it has spare cycles.
	 */
	{
		name: "prefetch",
		mode: "production",
		entry: { home: { import: "./src/routes/home.js", html: true } },
		output: {
			path: distFor("prefetch"),
			filename: "[name].[contenthash:8].js",
			chunkFilename: "[name].[contenthash:8].chunk.js",
			module: true,
			resourceHints: "prefetch"
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { html: true, outputModule: true }
	},

	/*
	 * 3. CUSTOM ARRAY — you supply the exact `<link>` list.
	 * Each descriptor is one `HtmlResourceHint`. Reference an entry/chunk by
	 * name (webpack resolves the URL) or pass a literal `href` for third-party
	 * resources like `preconnect` / prefetched fonts.
	 */
	{
		name: "custom-array",
		mode: "production",
		entry: {
			home: { import: "./src/routes/home.js", html: true },
			settings: "./src/routes/settings.js"
		},
		output: {
			path: distFor("custom-array"),
			filename: "[name].[contenthash:8].js",
			chunkFilename: "[name].[contenthash:8].chunk.js",
			module: true,
			resourceHints: [
				{ rel: "preconnect", href: "https://cdn.example.com" },
				{ rel: "preconnect", href: "https://api.example.com" },
				{
					rel: "preload",
					href: "/fonts/inter.woff2",
					as: "font",
					type: "font/woff2",
					crossorigin: true
				},
				// Chunk / entry references — webpack fills in the emitted filename.
				{ rel: "modulepreload", chunk: "runtime" },
				// `fetchPriority` is emitted on prefetch too (spec draft allows it).
				{ rel: "prefetch", entry: "settings", fetchPriority: "low" }
			]
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { html: true, outputModule: true }
	},

	/*
	 * 4. CALLBACK — full control per entrypoint.
	 * Receives the auto `defaultHints` plus context. Same function serves
	 * HTML pages (`hostType === "html"`) and JS-only entries whose hints are
	 * exposed via `stats.entrypoints[name].resourceHints` (`hostType === "js"`).
	 * Use for CDN swap, per-route pruning, or adding SSR-only descriptors.
	 */
	{
		name: "callback",
		mode: "production",
		entry: { home: { import: "./src/routes/home.js", html: true } },
		output: {
			path: distFor("callback"),
			filename: "[name].[contenthash:8].js",
			chunkFilename: "[name].[contenthash:8].chunk.js",
			module: true,
			resourceHints: ({ entryName, hostType, defaultHints }) => {
				// Full control: drop / keep / add. `d.hostChunks` names the
				// referencing chunk(s) (Vite's `hostId`) so you can act per origin.
				// (In the HTML build path kept auto hints render with their prebuilt
				// tag; the SSR / manifest path — scenario 7 — also honors rewrites.)
				const cdn = "https://cdn.example.com";
				return [
					...defaultHints,
					{
						rel: "preload",
						href: `${cdn}/hero-${entryName}-${hostType}.jpg`,
						as: "image",
						fetchPriority: "high"
					}
				];
			}
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { html: true, outputModule: true }
	},

	/*
	 * 5. URL HINT RULES — `webpackPreload`/`webpackPrefetch` defaults matched
	 * per URL request. Set on the parser that owns the URL: JS for
	 * `new URL(...)`, CSS for `url(...)`, HTML for `<img src>` / `<link href>`.
	 * Magic comments on individual URLs still win.
	 */
	{
		name: "url-hints",
		mode: "production",
		entry: { home: { import: "./src/routes/home-with-assets.js", html: true } },
		output: {
			path: distFor("url-hints"),
			filename: "[name].[contenthash:8].js",
			chunkFilename: "[name].[contenthash:8].chunk.js",
			assetModuleFilename: "assets/[name].[hash:8][ext]",
			module: true,
			// Combine with the auto chunks preload above.
			resourceHints: true
		},
		module: {
			parser: {
				javascript: {
					urlHints: [
						{
							test: /\.woff2$/,
							preload: true,
							as: "font",
							type: "font/woff2",
							fetchPriority: "high"
						},
						{
							include: /\/hero\//,
							preload: true,
							as: "image",
							fetchPriority: "high"
						},
						{
							test: /\.(png|jpg|webp)$/,
							exclude: /\/hero\//,
							prefetch: true,
							fetchPriority: "low"
						}
					]
				}
			},
			rules: [{ test: /\.(png|jpg|webp|woff2)$/, type: "asset/resource" }]
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { html: true, outputModule: true }
	},

	/*
	 * 6. PER-MODULE-RULE SCOPING — because `urlHints` is a parser option, a
	 * `module.rules[].parser` entry narrows the ruleset to a subtree. Here the
	 * project-wide default is `prefetch`, but critical routes upgrade to
	 * `preload`.
	 */
	{
		name: "url-hints-scoped",
		mode: "production",
		entry: { home: { import: "./src/routes/home-with-assets.js", html: true } },
		output: {
			path: distFor("url-hints-scoped"),
			filename: "[name].[contenthash:8].js",
			chunkFilename: "[name].[contenthash:8].chunk.js",
			assetModuleFilename: "assets/[name].[hash:8][ext]",
			module: true
		},
		module: {
			rules: [
				{ test: /\.(png|jpg|woff2)$/, type: "asset/resource" },
				{
					test: /\.js$/,
					include: /\/routes\/critical\//,
					parser: {
						// Overrides the project-wide rule below for critical-route JS.
						urlHints: [{ test: /\.woff2$/, preload: true, as: "font" }]
					}
				}
			],
			parser: {
				javascript: {
					urlHints: [{ test: /\.woff2$/, prefetch: true }]
				}
			}
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { html: true, outputModule: true }
	},

	/*
	 * 7. SSR MANIFEST — a JS-only build (no HTML entry). The callback tags the
	 * runtime chunk high-priority using `hostChunks` (Vite's `hostId`);
	 * `output.resourceHints.manifest` writes the result to a JSON file
	 * (`{ [entry]: descriptors }`) so the server can inject the `<link>`s without
	 * walking the chunk graph. The same data is on
	 * `stats.entrypoints[name].resourceHints` (`stats: { chunkGroupResourceHints: true }`).
	 */
	{
		name: "ssr",
		mode: "production",
		target: "web",
		entry: {
			home: "./src/routes/home-with-assets.js",
			product: "./src/routes/product.js"
		},
		output: {
			path: distFor("ssr"),
			filename: "[name].[contenthash:8].js",
			chunkFilename: "[name].[contenthash:8].chunk.js",
			assetModuleFilename: "assets/[name].[hash:8][ext]",
			publicPath: "/static/",
			module: true,
			resourceHints: {
				initial: ({ defaultHints }) =>
					defaultHints.map((d) =>
						d.hostChunks.includes("runtime")
							? { ...d, fetchPriority: "high" }
							: d
					),
				manifest: "ssr-hints.json"
			}
		},
		module: {
			parser: {
				javascript: {
					urlHints: [
						{
							test: /\.woff2$/,
							preload: true,
							as: "font",
							fetchPriority: "high"
						}
					]
				}
			},
			rules: [{ test: /\.(png|woff2)$/, type: "asset/resource" }]
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { outputModule: true },
		stats: { chunkGroupResourceHints: true }
	},

	/*
	 * 8. FONT PRELOAD — `module.parser.css.fontPreload: true` auto-emits
	 * `<link rel="preload" as="font">` for the primary `src` of each
	 * `@font-face` reachable from an HTML entry's initial CSS. Only the first
	 * url per `@font-face` is preloaded (preloading every format would
	 * double-download); `urlHints` rules / magic comments still override.
	 */
	{
		name: "font-preload",
		mode: "production",
		entry: { home: { import: "./src/routes/home-with-css.js", html: true } },
		output: {
			path: distFor("font-preload"),
			filename: "[name].[contenthash:8].js",
			chunkFilename: "[name].[contenthash:8].chunk.js",
			assetModuleFilename: "assets/[name].[hash:8][ext]",
			module: true,
			resourceHints: true
		},
		module: {
			parser: { css: { fontPreload: true } },
			rules: [{ test: /\.woff2?$/, type: "asset/resource" }]
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { html: true, outputModule: true, css: true }
	},

	/*
	 * 9. OFF — `output.resourceHints: "none"` is a hard off switch: no `<link>`
	 * is emitted anywhere (chunk hints and URL-asset hints), and the stats /
	 * manifest lists are empty. `false` only disables the auto chunk hints —
	 * URL-asset hints from magic comments / `urlHints` keep firing.
	 */
	{
		name: "none",
		mode: "production",
		entry: { home: { import: "./src/routes/home.js", html: true } },
		output: {
			path: distFor("none"),
			filename: "[name].[contenthash:8].js",
			chunkFilename: "[name].[contenthash:8].chunk.js",
			module: true,
			resourceHints: "none"
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { html: true, outputModule: true }
	},

	/*
	 * 10. GLOBAL URL HINTS — `output.resourceHints.urlHints` is a project-wide shorthand for
	 * the same rule list under every parser (JS `new URL`, CSS `url()`, HTML
	 * `<img src>`), so you write it once. Parser-scoped `parser.<type>.urlHints`
	 * and per-URL magic comments still override it.
	 */
	{
		name: "url-hints-global",
		mode: "production",
		entry: { home: { import: "./src/routes/home-with-assets.js", html: true } },
		output: {
			path: distFor("url-hints-global"),
			filename: "[name].[contenthash:8].js",
			chunkFilename: "[name].[contenthash:8].chunk.js",
			assetModuleFilename: "assets/[name].[hash:8][ext]",
			module: true,
			resourceHints: {
				initial: true,
				urlHints: [
					{
						test: /\.woff2$/,
						preload: true,
						as: "font",
						fetchPriority: "high"
					},
					{ test: /\.(png|jpg|webp)$/, prefetch: true, fetchPriority: "low" }
				]
			}
		},
		module: {
			rules: [{ test: /\.(png|jpg|webp|woff2)$/, type: "asset/resource" }]
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { html: true, outputModule: true }
	},

	/*
	 * 11. ASYNC-CHUNK CSS PRELOAD — `parser.javascript.dynamicImportCssPreload`.
	 * Auto-emit `<link rel="preload" as="style">` for a dynamically imported
	 * chunk's CSS so it fetches in parallel with the chunk instead of after its
	 * JS parses. Unlike `dynamicImportPreload`, the JS itself is not preloaded.
	 */
	{
		name: "async-css-preload",
		mode: "production",
		entry: { home: { import: "./src/routes/async-host.js", html: true } },
		output: {
			path: distFor("async-css-preload"),
			filename: "[name].[contenthash:8].js",
			chunkFilename: "[name].[contenthash:8].chunk.js",
			module: true,
			resourceHints: true
		},
		module: {
			parser: { javascript: { dynamicImportCssPreload: true } }
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { html: true, outputModule: true, css: true }
	},

	/*
	 * 12. AUTO PRECONNECT — `output.resourceHints.preconnect`. When bundles/assets are
	 * served from a cross-origin CDN (`output.publicPath`), emit a
	 * `<link rel="preconnect">` for that origin so the browser opens the
	 * connection early. Mirrors `output.crossOriginLoading`.
	 */
	{
		name: "auto-preconnect",
		mode: "production",
		entry: { home: { import: "./src/routes/home.js", html: true } },
		output: {
			path: distFor("auto-preconnect"),
			filename: "[name].[contenthash:8].js",
			chunkFilename: "[name].[contenthash:8].chunk.js",
			publicPath: "https://cdn.example.com/static/",
			crossOriginLoading: "anonymous",
			module: true,
			resourceHints: { initial: true, preconnect: true }
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { html: true, outputModule: true }
	},

	/*
	 * 13. FULL OBJECT — every knob in one place. `initial` is the chunk-hint
	 * behavior; `urlHints` seeds URL-asset defaults under every parser;
	 * `preconnect` warms the CDN; `modulePreloadPolyfill` toggles the polyfill;
	 * `manifest` writes the SSR JSON file.
	 */
	{
		name: "object-form",
		mode: "production",
		entry: { home: { import: "./src/routes/home-with-assets.js", html: true } },
		output: {
			path: distFor("object-form"),
			filename: "[name].[contenthash:8].js",
			chunkFilename: "[name].[contenthash:8].chunk.js",
			assetModuleFilename: "assets/[name].[hash:8][ext]",
			publicPath: "https://cdn.example.com/static/",
			crossOriginLoading: "anonymous",
			module: true,
			resourceHints: {
				initial: true,
				urlHints: [
					{ test: /\.woff2$/, preload: true, as: "font", fetchPriority: "high" }
				],
				preconnect: true,
				modulePreloadPolyfill: true,
				manifest: "ssr-hints.json"
			}
		},
		module: {
			rules: [{ test: /\.(png|jpg|webp|woff2)$/, type: "asset/resource" }]
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { html: true, outputModule: true }
	},

	/*
	 * 14. STRICT CSP — `modulePreloadPolyfill: false`. The polyfill default is
	 * derived from `output.environment.modulePreload`; on a target without native
	 * support it would inject an inline `<script>`. Under a CSP that forbids
	 * inline scripts, opt out — the `<link rel="modulepreload">` tags still emit.
	 */
	{
		name: "csp-no-polyfill",
		mode: "production",
		target: ["web", "es2015"],
		entry: { home: { import: "./src/routes/home.js", html: true } },
		output: {
			path: distFor("csp-no-polyfill"),
			filename: "[name].[contenthash:8].js",
			chunkFilename: "[name].[contenthash:8].chunk.js",
			module: true,
			environment: { modulePreload: false },
			resourceHints: { initial: true, modulePreloadPolyfill: false }
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { html: true, outputModule: true }
	},

	/*
	 * 15. ASYNC JS + CSS PRELOAD — `parser.javascript.dynamicImportPreload`
	 * couples both (like Vite): a dynamically imported chunk's JS and CSS are
	 * preloaded together. Contrast with scenario 11 (`dynamicImportCssPreload`),
	 * which preloads only the CSS.
	 */
	{
		name: "async-js-css-preload",
		mode: "production",
		entry: { home: { import: "./src/routes/async-host.js", html: true } },
		output: {
			path: distFor("async-js-css-preload"),
			filename: "[name].[contenthash:8].js",
			chunkFilename: "[name].[contenthash:8].chunk.js",
			module: true,
			resourceHints: true
		},
		module: {
			parser: { javascript: { dynamicImportPreload: true } }
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { html: true, outputModule: true, css: true }
	},

	/*
	 * 16. ESM DEFAULT — nothing set. Because `output.module` is on, `initial`
	 * defaults to `true` (Vite-style), so the entry's initial chunks get
	 * `<link rel="modulepreload">` with no `resourceHints` config at all.
	 * Classic output stays opt-in.
	 */
	{
		name: "esm-default",
		mode: "production",
		entry: { home: { import: "./src/routes/home.js", html: true } },
		output: {
			path: distFor("esm-default"),
			filename: "[name].[contenthash:8].js",
			chunkFilename: "[name].[contenthash:8].chunk.js",
			module: true
			// no `resourceHints` — ESM output enables it by default
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { html: true, outputModule: true }
	}
];
```

# src/routes/home.js

```javascript
// Basic JS-only entry — no URL-referenced assets.
// Uses `import()` for a code-split settings route so there's a real vendor
// / async chunk for the resource-hint machinery to hint about.
async function loadSettings() {
	const mod = await import("./settings.js");
	return mod.default;
}

console.log("home", loadSettings);
```

# src/routes/home-with-assets.js

```javascript
// Entry that references URL-based assets, so the `urlHints` parser rules
// have something to match. With the rules in `webpack.config.js`:
//   - font.woff2 → preload, as="font", type="font/woff2", fetchpriority="high"
//   - hero/banner.jpg → preload, as="image", fetchpriority="high"
//   - thumb.png → prefetch, fetchpriority="low"
const font = new URL("../fonts/inter.woff2", import.meta.url);
const hero = new URL("../hero/banner.jpg", import.meta.url);
const thumb = new URL("../thumb.png", import.meta.url);

// Explicit magic comment — wins over any `urlHints` rule for this URL.
const iconOverride = new URL(
	/* webpackPreload: true, webpackAs: "image" */ "../icon.png",
	import.meta.url
);

console.log(font.href, hero.href, thumb.href, iconOverride.href);
```

# src/routes/home-with-css.js

```javascript
// The initial-graph CSS declares an `@font-face`; `parser.css.fontPreload`
// auto-emits a `<link rel="preload" as="font">` for its primary src.
import "../styles/app.css";

console.log("home with css");
```

# src/styles/app.css

```css
@font-face {
	font-family: "Inter";
	src:
		url("../fonts/inter.woff2") format("woff2"),
		url("../fonts/inter.woff") format("woff");
}

body {
	font-family: "Inter", sans-serif;
}
```

# SSR: the manifest file

With `output.resourceHints.manifest: "ssr-hints.json"`, webpack writes the
manifest for you during the build — no stats plumbing needed:

```js
// dist/ssr/ssr-hints.json
const manifest = require("./dist/ssr/ssr-hints.json");
// { "home": [ { rel, href, as?, type?, media?, fetchPriority? }, ... ], "product": [ ... ] }
```

Prefer computing it in-process (e.g. custom filtering)? The same data is on
`stats.entrypoints[name].resourceHints`:

```js
const webpack = require("webpack");
const fs = require("fs");

webpack(require("./webpack.config").find((c) => c.name === "ssr"), (err, stats) => {
  if (err || stats.hasErrors()) return console.error(err || stats.toJson().errors);

  const json = stats.toJson({
    all: false,
    entrypoints: true,
    chunkGroupResourceHints: true
  });
  const manifest = {};
  for (const [name, ep] of Object.entries(json.entrypoints)) {
    manifest[name] = ep.resourceHints || [];
  }
  fs.writeFileSync("dist/ssr/hints.json", JSON.stringify(manifest, null, 2));
});
```

Server:

```js
const escape = (s) => String(s).replace(/"/g, "&quot;");

const renderHint = (h) => {
  const attrs = [];
  if (h.as) attrs.push(`as="${escape(h.as)}"`);
  if (h.type) attrs.push(`type="${escape(h.type)}"`);
  if (h.media) attrs.push(`media="${escape(h.media)}"`);
  if (h.fetchPriority) attrs.push(`fetchpriority="${escape(h.fetchPriority)}"`);
  return `<link rel="${h.rel}" href="${escape(h.href)}"${attrs.length ? " " + attrs.join(" ") : ""}>`;
};

app.get("/product/:id", (req, res) => {
  res.type("html").send(`<!doctype html>
<html>
  <head>
    ${(manifest.product || []).map(renderHint).join("\n    ")}
    <title>Product</title>
  </head>
  <body>
    <div id="root">${renderToString(<App id={req.params.id} />)}</div>
    <script type="module" src="/static/product.js"></script>
  </body>
</html>`);
});
```

# Async chunks

`output.resourceHints` and `module.parser.<type>.urlHints` cover the
**initial** graph only. Hints for chunks loaded via `import()` are their
own subsystem — use `module.parser.javascript.dynamicImportPrefetch` /
`dynamicImportPreload` / `dynamicImportFetchPriority`, or per-call
`/* webpackPrefetch: true */` magic comments. Those route through
webpack's existing on-demand chunk-load runtime. `dynamicImportCssPreload`
is a CSS-only variant: it preloads a dynamically imported chunk's stylesheet
(`as="style"`) in parallel with the chunk, without preloading its JS.

# Precedence

Highest wins:

1. Per-URL magic comment (`webpackPreload: true`, `webpackAs: "font"`, …)
2. `module.parser.<type>.urlHints` rule match
3. Nothing (no hint emitted for that URL)

For chunk hints, `output.resourceHints` is a single source of truth — the
callback form receives auto defaults and can filter / add / rewrite them
however you need.

# Info

## webpack output

```
auto:
  asset runtime.a4154a99.js 6.64 KiB [emitted] [immutable] [javascript module] (name: runtime)
  asset home.6d8d52f7.js 1.31 KiB [emitted] [immutable] [javascript module] (name: home)
  asset __html_9b425bba_0.2e2af83c.chunk.js 1.26 KiB [emitted] [immutable] [javascript module] (name: __html_9b425bba_0)
  asset src_routes_settings_js.2107bc69.chunk.js 943 bytes [emitted] [immutable] [javascript module]
  asset home.6a0b13a2.html 237 bytes [emitted] [immutable] (auxiliary name: home)
  Entrypoint home 7.95 KiB (237 bytes) = runtime.a4154a99.js 6.64 KiB home.6d8d52f7.js 1.31 KiB 1 auxiliary asset
  Entrypoint __html_9b425bba_0 7.9 KiB = runtime.a4154a99.js 6.64 KiB __html_9b425bba_0.2e2af83c.chunk.js 1.26 KiB
  runtime modules 3.62 KiB 8 modules
  cacheable modules 470 bytes (javascript) 98 bytes (html)
    data:text/html,<!doctype html><html><head><script src="./src/routes/home.js"></script></head><bod...(truncated) 108 bytes (javascript) 98 bytes (html) [built] [code generated]
      [exports: default]
      [used exports unknown]
      entry data:text/html,<!doctype html><.. home
    ./src/routes/home.js 328 bytes [built] [code generated]
      [used exports unknown]
      entry ./src/routes/home.js __html_9b425bba_0
    ./src/routes/settings.js 34 bytes [built] [code generated]
      [exports: default]
      [used exports unknown]
      import() ./settings.js ./src/routes/home.js 5:19-42
  auto (webpack X.X.X) compiled successfully

prefetch:
  asset runtime.a4154a99.js 6.64 KiB [emitted] [immutable] [javascript module] (name: runtime)
  asset home.6d8d52f7.js 1.31 KiB [emitted] [immutable] [javascript module] (name: home)
  asset __html_9b425bba_0.2e2af83c.chunk.js 1.26 KiB [emitted] [immutable] [javascript module] (name: __html_9b425bba_0)
  asset src_routes_settings_js.2107bc69.chunk.js 943 bytes [emitted] [immutable] [javascript module]
  asset home.51200da9.html 232 bytes [emitted] [immutable] (auxiliary name: home)
  Entrypoint home 7.95 KiB (232 bytes) = runtime.a4154a99.js 6.64 KiB home.6d8d52f7.js 1.31 KiB 1 auxiliary asset
  Entrypoint __html_9b425bba_0 7.9 KiB = runtime.a4154a99.js 6.64 KiB __html_9b425bba_0.2e2af83c.chunk.js 1.26 KiB
  runtime modules 3.62 KiB 8 modules
  cacheable modules 470 bytes (javascript) 98 bytes (html)
    data:text/html,<!doctype html><html><head><script src="./src/routes/home.js"></script></head><bod...(truncated) 108 bytes (javascript) 98 bytes (html) [built] [code generated]
      [exports: default]
      [used exports unknown]
      entry data:text/html,<!doctype html><.. home
    ./src/routes/home.js 328 bytes [built] [code generated]
      [used exports unknown]
      entry ./src/routes/home.js __html_9b425bba_0
    ./src/routes/settings.js 34 bytes [built] [code generated]
      [exports: default]
      [used exports unknown]
      import() ./settings.js ./src/routes/home.js 5:19-42
  prefetch (webpack X.X.X) compiled successfully

custom-array:
  asset runtime.0211bee8.js 6.64 KiB [emitted] [immutable] [javascript module] (name: runtime)
  asset home.31bcb9fe.js 1.7 KiB [emitted] [immutable] [javascript module] (name: home)
  asset __html_9b425bba_0.3c97e6b8.chunk.js 1.25 KiB [emitted] [immutable] [javascript module] (name: __html_9b425bba_0)
  asset settings.3988ca2b.js 1.23 KiB [emitted] [immutable] [javascript module] (name: settings)
  asset src_routes_settings_js.94a93042.chunk.js 961 bytes [emitted] [immutable] [javascript module]
  asset home.17b8ead9.html 604 bytes [emitted] [immutable] (auxiliary name: home)
  Entrypoint home 8.34 KiB (604 bytes) = runtime.0211bee8.js 6.64 KiB home.31bcb9fe.js 1.7 KiB 1 auxiliary asset
  Entrypoint settings 7.87 KiB = runtime.0211bee8.js 6.64 KiB settings.3988ca2b.js 1.23 KiB
  Entrypoint __html_9b425bba_0 7.89 KiB = runtime.0211bee8.js 6.64 KiB __html_9b425bba_0.3c97e6b8.chunk.js 1.25 KiB
  runtime modules 3.62 KiB 8 modules
  cacheable modules 470 bytes (javascript) 98 bytes (html)
    data:text/html,<!doctype html><html><head><script src="./src/routes/home.js"></script></head><bod...(truncated) 108 bytes (javascript) 98 bytes (html) [built] [code generated]
      [exports: default]
      [used exports unknown]
      entry data:text/html,<!doctype html><.. home
    ./src/routes/home.js 328 bytes [built] [code generated]
      [used exports unknown]
      entry ./src/routes/home.js __html_9b425bba_0
    ./src/routes/settings.js 34 bytes [built] [code generated]
      [exports: default]
      [used exports unknown]
      import() ./settings.js ./src/routes/home.js 5:19-42
      entry ./src/routes/settings.js settings
  custom-array (webpack X.X.X) compiled successfully

callback:
  asset runtime.a4154a99.js 6.64 KiB [emitted] [immutable] [javascript module] (name: runtime)
  asset home.6d8d52f7.js 1.42 KiB [emitted] [immutable] [javascript module] (name: home)
  asset __html_9b425bba_0.2e2af83c.chunk.js 1.26 KiB [emitted] [immutable] [javascript module] (name: __html_9b425bba_0)
  asset src_routes_settings_js.2107bc69.chunk.js 943 bytes [emitted] [immutable] [javascript module]
  asset home.c5cd1660.html 339 bytes [emitted] [immutable] (auxiliary name: home)
  Entrypoint home 8.06 KiB (339 bytes) = runtime.a4154a99.js 6.64 KiB home.6d8d52f7.js 1.42 KiB 1 auxiliary asset
  Entrypoint __html_9b425bba_0 7.9 KiB = runtime.a4154a99.js 6.64 KiB __html_9b425bba_0.2e2af83c.chunk.js 1.26 KiB
  runtime modules 3.62 KiB 8 modules
  cacheable modules 470 bytes (javascript) 98 bytes (html)
    data:text/html,<!doctype html><html><head><script src="./src/routes/home.js"></script></head><bod...(truncated) 108 bytes (javascript) 98 bytes (html) [built] [code generated]
      [exports: default]
      [used exports unknown]
      entry data:text/html,<!doctype html><.. home
    ./src/routes/home.js 328 bytes [built] [code generated]
      [used exports unknown]
      entry ./src/routes/home.js __html_9b425bba_0
    ./src/routes/settings.js 34 bytes [built] [code generated]
      [exports: default]
      [used exports unknown]
      import() ./settings.js ./src/routes/home.js 5:19-42
  callback (webpack X.X.X) compiled successfully

url-hints:
  assets by path assets/ 0 bytes
    assets by path assets/*.png 0 bytes
      asset assets/icon.31d6cfe0.png 0 bytes [emitted] [immutable] [from: src/icon.png] (auxiliary name: __html_545c7cf9_0)
      asset assets/thumb.31d6cfe0.png 0 bytes [emitted] [immutable] [from: src/thumb.png] (auxiliary name: __html_545c7cf9_0)
    asset assets/banner.31d6cfe0.jpg 0 bytes [emitted] [immutable] [from: src/hero/banner.jpg] (auxiliary name: __html_545c7cf9_0)
    asset assets/inter.31d6cfe0.woff2 0 bytes [emitted] [immutable] [from: src/fonts/inter.woff2] (auxiliary name: __html_545c7cf9_0)
  assets by path *.js 10.3 KiB
    asset runtime.0428e0d3.js 4.94 KiB [emitted] [immutable] [javascript module] (name: runtime)
    asset __html_545c7cf9_0.34832faf.chunk.js 3.6 KiB [emitted] [immutable] [javascript module] (name: __html_545c7cf9_0)
    asset home.e89aa7f6.js 1.73 KiB [emitted] [immutable] [javascript module] (name: home)
  asset home.91b13b03.html 595 bytes [emitted] [immutable] (auxiliary name: home)
  Entrypoint home 6.67 KiB (595 bytes) = runtime.0428e0d3.js 4.94 KiB home.e89aa7f6.js 1.73 KiB 1 auxiliary asset
  Entrypoint __html_545c7cf9_0 8.54 KiB = runtime.0428e0d3.js 4.94 KiB __html_545c7cf9_0.34832faf.chunk.js 3.6 KiB 4 auxiliary assets
  runtime modules 2.38 KiB 7 modules
  cacheable modules 4 bytes (asset) 1.04 KiB (javascript) 110 bytes (html)
    asset modules 4 bytes (asset) 168 bytes (javascript)
      modules by path ./src/*.png 2 bytes (asset) 84 bytes (javascript)
        ./src/thumb.png 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
          [no exports]
          [used exports unknown]
          new URL() ../thumb.png ./src/routes/home-with-assets.js 8:14-54
        ./src/icon.png 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
          [no exports]
          [used exports unknown]
          new URL() ../icon.png ./src/routes/home-with-assets.js 11:21-14:1
      ./src/fonts/inter.woff2 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
        [no exports]
        [used exports unknown]
        new URL() ../fonts/inter.woff2 ./src/routes/home-with-assets.js 6:13-61
      ./src/hero/banner.jpg 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
        [no exports]
        [used exports unknown]
        new URL() ../hero/banner.jpg ./src/routes/home-with-assets.js 7:13-59
    data:text/html,<!doctype html><html><head><script src="./src/routes/home-with-assets.js"></script...(truncated) 120 bytes (javascript) 110 bytes (html) [built] [code generated]
      [exports: default]
      [used exports unknown]
      entry data:text/html,<!doctype html><.. home
    ./src/routes/home-with-assets.js 778 bytes [built] [code generated]
      [used exports unknown]
      entry ./src/routes/home-with-assets.js __html_545c7cf9_0
  url-hints (webpack X.X.X) compiled successfully

url-hints-scoped:
  assets by path assets/ 0 bytes
    assets by path assets/*.png 0 bytes
      asset assets/icon.31d6cfe0.png 0 bytes [emitted] [immutable] [from: src/icon.png] (auxiliary name: __html_545c7cf9_0)
      asset assets/thumb.31d6cfe0.png 0 bytes [emitted] [immutable] [from: src/thumb.png] (auxiliary name: __html_545c7cf9_0)
    asset assets/banner.31d6cfe0.jpg 0 bytes [emitted] [immutable] [from: src/hero/banner.jpg] (auxiliary name: __html_545c7cf9_0)
    asset assets/inter.31d6cfe0.woff2 0 bytes [emitted] [immutable] [from: src/fonts/inter.woff2] (auxiliary name: __html_545c7cf9_0)
  assets by path *.js 10 KiB
    asset runtime.0428e0d3.js 4.94 KiB [emitted] [immutable] [javascript module] (name: runtime)
    asset __html_545c7cf9_0.34832faf.chunk.js 3.6 KiB [emitted] [immutable] [javascript module] (name: __html_545c7cf9_0)
    asset home.e89aa7f6.js 1.49 KiB [emitted] [immutable] [javascript module] (name: home)
  asset home.27242e89.html 366 bytes [emitted] [immutable] (auxiliary name: home)
  Entrypoint home 6.42 KiB (366 bytes) = runtime.0428e0d3.js 4.94 KiB home.e89aa7f6.js 1.49 KiB 1 auxiliary asset
  Entrypoint __html_545c7cf9_0 8.54 KiB = runtime.0428e0d3.js 4.94 KiB __html_545c7cf9_0.34832faf.chunk.js 3.6 KiB 4 auxiliary assets
  runtime modules 2.38 KiB 7 modules
  cacheable modules 4 bytes (asset) 1.04 KiB (javascript) 110 bytes (html)
    asset modules 4 bytes (asset) 168 bytes (javascript)
      modules by path ./src/*.png 2 bytes (asset) 84 bytes (javascript)
        ./src/thumb.png 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
          [no exports]
          [used exports unknown]
          new URL() ../thumb.png ./src/routes/home-with-assets.js 8:14-54
        ./src/icon.png 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
          [no exports]
          [used exports unknown]
          new URL() ../icon.png ./src/routes/home-with-assets.js 11:21-14:1
      ./src/fonts/inter.woff2 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
        [no exports]
        [used exports unknown]
        new URL() ../fonts/inter.woff2 ./src/routes/home-with-assets.js 6:13-61
      ./src/hero/banner.jpg 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
        [no exports]
        [used exports unknown]
        new URL() ../hero/banner.jpg ./src/routes/home-with-assets.js 7:13-59
    data:text/html,<!doctype html><html><head><script src="./src/routes/home-with-assets.js"></script...(truncated) 120 bytes (javascript) 110 bytes (html) [built] [code generated]
      [exports: default]
      [used exports unknown]
      entry data:text/html,<!doctype html><.. home
    ./src/routes/home-with-assets.js 778 bytes [built] [code generated]
      [used exports unknown]
      entry ./src/routes/home-with-assets.js __html_545c7cf9_0
  url-hints-scoped (webpack X.X.X) compiled successfully

ssr:
  assets by path assets/ 0 bytes
    assets by path assets/*.jpg 0 bytes
      asset assets/banner.31d6cfe0.jpg 0 bytes [emitted] [immutable] [from: src/hero/banner.jpg] (auxiliary name: home)
      asset assets/product.31d6cfe0.jpg 0 bytes [emitted] [immutable] [from: src/hero/product.jpg] (auxiliary name: product)
    assets by path assets/*.png 0 bytes
      asset assets/icon.31d6cfe0.png 0 bytes [emitted] [immutable] [from: src/icon.png] (auxiliary name: home)
      asset assets/thumb.31d6cfe0.png 0 bytes [emitted] [immutable] [from: src/thumb.png] (auxiliary name: home)
    asset assets/inter.31d6cfe0.woff2 0 bytes [emitted] [immutable] [from: src/fonts/inter.woff2] (auxiliary name: home)
  assets by path *.js 9.72 KiB
    asset home.27a0472f.js 4.25 KiB [emitted] [immutable] [javascript module] (name: home)
    asset runtime.d0e8e650.js 4.13 KiB [emitted] [immutable] [javascript module] (name: runtime)
    asset product.0b6623b2.js 1.34 KiB [emitted] [immutable] [javascript module] (name: product)
  asset ssr-hints.json 699 bytes [emitted]
  Entrypoint home 8.38 KiB = runtime.d0e8e650.js 4.13 KiB home.27a0472f.js 4.25 KiB 4 auxiliary assets
  Entrypoint product 5.46 KiB = runtime.d0e8e650.js 4.13 KiB product.0b6623b2.js 1.34 KiB 1 auxiliary asset
  runtime modules 2.37 KiB 6 modules
  cacheable modules 5 bytes (asset) 1.07 KiB (javascript)
    asset modules 5 bytes (asset) 210 bytes (javascript)
      modules by path ./src/hero/*.jpg 2 bytes (asset) 84 bytes (javascript)
        ./src/hero/banner.jpg 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
          [no exports]
          [used exports unknown]
          new URL() ../hero/banner.jpg ./src/routes/home-with-assets.js 7:13-59
        ./src/hero/product.jpg 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
          [no exports]
          [used exports unknown]
          new URL() ../hero/product.jpg ./src/routes/product.js 1:16-63
      modules by path ./src/*.png 2 bytes (asset) 84 bytes (javascript)
        ./src/thumb.png 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
          [no exports]
          [used exports unknown]
          new URL() ../thumb.png ./src/routes/home-with-assets.js 8:14-54
        ./src/icon.png 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
          [no exports]
          [used exports unknown]
          new URL() ../icon.png ./src/routes/home-with-assets.js 11:21-14:1
      ./src/fonts/inter.woff2 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
        [no exports]
        [used exports unknown]
        new URL() ../fonts/inter.woff2 ./src/routes/home-with-assets.js 6:13-61
    javascript modules 881 bytes
      ./src/routes/home-with-assets.js 778 bytes [built] [code generated]
        [used exports unknown]
        entry ./src/routes/home-with-assets.js home
      ./src/routes/product.js 103 bytes [built] [code generated]
        [used exports unknown]
        entry ./src/routes/product.js product
  ssr (webpack X.X.X) compiled successfully

font-preload:
  assets by path *.js 7.19 KiB
    asset runtime.ffe2a219.js 4.48 KiB [emitted] [immutable] [javascript module] (name: runtime)
    asset home.86c41536.js 1.5 KiB [emitted] [immutable] [javascript module] (name: home)
    asset __html_d6cdf5c7_0.184f91d7.chunk.js 1.21 KiB [emitted] [immutable] [javascript module] (name: __html_d6cdf5c7_0)
  assets by path assets/ 0 bytes
    asset assets/inter.31d6cfe0.woff 0 bytes [emitted] [immutable] [from: src/fonts/inter.woff] (auxiliary name: __html_d6cdf5c7_0)
    asset assets/inter.31d6cfe0.woff2 0 bytes [emitted] [immutable] [from: src/fonts/inter.woff2] (auxiliary name: __html_d6cdf5c7_0)
  asset home.a7a56b53.html 386 bytes [emitted] [immutable] (auxiliary name: home)
  asset __html_d6cdf5c7_0.cc28d3e3.css 315 bytes [emitted] [immutable] (name: __html_d6cdf5c7_0)
  Entrypoint home 5.98 KiB (386 bytes) = runtime.ffe2a219.js 4.48 KiB home.86c41536.js 1.5 KiB 1 auxiliary asset
  Entrypoint __html_d6cdf5c7_0 6 KiB = runtime.ffe2a219.js 4.48 KiB __html_d6cdf5c7_0.184f91d7.chunk.js 1.21 KiB __html_d6cdf5c7_0.cc28d3e3.css 315 bytes 2 auxiliary assets
  runtime modules 2.04 KiB 8 modules
  cacheable modules 322 bytes (javascript) 2 bytes (asset) 84 bytes (asset-url) 107 bytes (html) 181 bytes (css)
    modules by path ./src/ 205 bytes (javascript) 2 bytes (asset) 84 bytes (asset-url)
      ./src/routes/home-with-css.js 205 bytes [built] [code generated]
        [no exports]
        [used exports unknown]
        entry ./src/routes/home-with-css.js __html_d6cdf5c7_0
      ./src/fonts/inter.woff2 1 bytes (asset) 42 bytes (asset-url) [built] [code generated]
        [no exports]
        [used exports unknown]
        css url() ../fonts/inter.woff2 css ./src/styles/app.css 4:6-28
      ./src/fonts/inter.woff 1 bytes (asset) 42 bytes (asset-url) [built] [code generated]
        [no exports]
        [used exports unknown]
        css url() ../fonts/inter.woff css ./src/styles/app.css 5:6-27
    data:text/html,<!doctype html><html><head><script src="./src/routes/home-with-css.js"></script></...(truncated) 117 bytes (javascript) 107 bytes (html) [built] [code generated]
      [exports: default]
      [used exports unknown]
      entry data:text/html,<!doctype html><.. home
    css ./src/styles/app.css 181 bytes [built] [code generated]
      [no exports]
      [used exports unknown]
      harmony side effect evaluation ../styles/app.css ./src/routes/home-with-css.js 3:0-27
  font-preload (webpack X.X.X) compiled successfully

none:
  asset runtime.a4154a99.js 6.64 KiB [emitted] [immutable] [javascript module] (name: runtime)
  asset __html_9b425bba_0.2e2af83c.chunk.js 1.26 KiB [emitted] [immutable] [javascript module] (name: __html_9b425bba_0)
  asset home.6d8d52f7.js 1.26 KiB [emitted] [immutable] [javascript module] (name: home)
  asset src_routes_settings_js.2107bc69.chunk.js 943 bytes [emitted] [immutable] [javascript module]
  asset home.a96deb30.html 184 bytes [emitted] [immutable] (auxiliary name: home)
  Entrypoint home 7.9 KiB (184 bytes) = runtime.a4154a99.js 6.64 KiB home.6d8d52f7.js 1.26 KiB 1 auxiliary asset
  Entrypoint __html_9b425bba_0 7.9 KiB = runtime.a4154a99.js 6.64 KiB __html_9b425bba_0.2e2af83c.chunk.js 1.26 KiB
  runtime modules 3.62 KiB 8 modules
  cacheable modules 470 bytes (javascript) 98 bytes (html)
    data:text/html,<!doctype html><html><head><script src="./src/routes/home.js"></script></head><bod...(truncated) 108 bytes (javascript) 98 bytes (html) [built] [code generated]
      [exports: default]
      [used exports unknown]
      entry data:text/html,<!doctype html><.. home
    ./src/routes/home.js 328 bytes [built] [code generated]
      [used exports unknown]
      entry ./src/routes/home.js __html_9b425bba_0
    ./src/routes/settings.js 34 bytes [built] [code generated]
      [exports: default]
      [used exports unknown]
      import() ./settings.js ./src/routes/home.js 5:19-42
  none (webpack X.X.X) compiled successfully

url-hints-global:
  assets by path assets/ 0 bytes
    assets by path assets/*.png 0 bytes
      asset assets/icon.31d6cfe0.png 0 bytes [emitted] [immutable] [from: src/icon.png] (auxiliary name: __html_545c7cf9_0)
      asset assets/thumb.31d6cfe0.png 0 bytes [emitted] [immutable] [from: src/thumb.png] (auxiliary name: __html_545c7cf9_0)
    asset assets/banner.31d6cfe0.jpg 0 bytes [emitted] [immutable] [from: src/hero/banner.jpg] (auxiliary name: __html_545c7cf9_0)
    asset assets/inter.31d6cfe0.woff2 0 bytes [emitted] [immutable] [from: src/fonts/inter.woff2] (auxiliary name: __html_545c7cf9_0)
  assets by path *.js 10.2 KiB
    asset runtime.0428e0d3.js 4.94 KiB [emitted] [immutable] [javascript module] (name: runtime)
    asset __html_545c7cf9_0.34832faf.chunk.js 3.6 KiB [emitted] [immutable] [javascript module] (name: __html_545c7cf9_0)
    asset home.e89aa7f6.js 1.71 KiB [emitted] [immutable] [javascript module] (name: home)
  asset home.001b1beb.html 577 bytes [emitted] [immutable] (auxiliary name: home)
  Entrypoint home 6.65 KiB (577 bytes) = runtime.0428e0d3.js 4.94 KiB home.e89aa7f6.js 1.71 KiB 1 auxiliary asset
  Entrypoint __html_545c7cf9_0 8.54 KiB = runtime.0428e0d3.js 4.94 KiB __html_545c7cf9_0.34832faf.chunk.js 3.6 KiB 4 auxiliary assets
  runtime modules 2.38 KiB 7 modules
  cacheable modules 4 bytes (asset) 1.04 KiB (javascript) 110 bytes (html)
    asset modules 4 bytes (asset) 168 bytes (javascript)
      modules by path ./src/*.png 2 bytes (asset) 84 bytes (javascript)
        ./src/thumb.png 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
          [no exports]
          [used exports unknown]
          new URL() ../thumb.png ./src/routes/home-with-assets.js 8:14-54
        ./src/icon.png 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
          [no exports]
          [used exports unknown]
          new URL() ../icon.png ./src/routes/home-with-assets.js 11:21-14:1
      ./src/fonts/inter.woff2 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
        [no exports]
        [used exports unknown]
        new URL() ../fonts/inter.woff2 ./src/routes/home-with-assets.js 6:13-61
      ./src/hero/banner.jpg 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
        [no exports]
        [used exports unknown]
        new URL() ../hero/banner.jpg ./src/routes/home-with-assets.js 7:13-59
    data:text/html,<!doctype html><html><head><script src="./src/routes/home-with-assets.js"></script...(truncated) 120 bytes (javascript) 110 bytes (html) [built] [code generated]
      [exports: default]
      [used exports unknown]
      entry data:text/html,<!doctype html><.. home
    ./src/routes/home-with-assets.js 778 bytes [built] [code generated]
      [used exports unknown]
      entry ./src/routes/home-with-assets.js __html_545c7cf9_0
  url-hints-global (webpack X.X.X) compiled successfully

async-css-preload:
  assets by path *.js 18 KiB
    asset runtime.86ed35f7.js 13.4 KiB [emitted] [immutable] [javascript module] (name: runtime)
    asset home.5b5cf1a7.js 1.33 KiB [emitted] [immutable] [javascript module] (name: home)
    asset __html_f953a09c_0.14374736.chunk.js 1.22 KiB [emitted] [immutable] [javascript module] (name: __html_f953a09c_0)
    asset mid.abf213d5.chunk.js 1.14 KiB [emitted] [immutable] [javascript module] (name: mid)
    asset styled-route.89138c94.chunk.js 934 bytes [emitted] [immutable] [javascript module] (name: styled-route)
  assets by chunk 0 bytes (auxiliary name: styled-route)
    asset 31d6cfe0d16ae931b73c.woff 0 bytes [emitted] [immutable] [from: src/fonts/inter.woff] (auxiliary name: styled-route)
    asset 31d6cfe0d16ae931b73c.woff2 0 bytes [emitted] [immutable] [from: src/fonts/inter.woff2] (auxiliary name: styled-route)
  asset styled-route.84a7fce8.chunk.css 313 bytes [emitted] [immutable] (name: styled-route)
  asset home.098c8950.html 237 bytes [emitted] [immutable] (auxiliary name: home)
  Entrypoint home 14.7 KiB (237 bytes) = runtime.86ed35f7.js 13.4 KiB home.5b5cf1a7.js 1.33 KiB 1 auxiliary asset
  Entrypoint __html_f953a09c_0 14.6 KiB = runtime.86ed35f7.js 13.4 KiB __html_f953a09c_0.14374736.chunk.js 1.22 KiB
  runtime modules 8.49 KiB 13 modules
  cacheable modules 574 bytes (javascript) 2 bytes (asset) 84 bytes (asset-url) 104 bytes (html) 181 bytes (css)
    modules by path ./src/ 460 bytes (javascript) 2 bytes (asset) 84 bytes (asset-url)
      javascript modules 460 bytes
        ./src/routes/async-host.js 310 bytes [built] [code generated]
          [used exports unknown]
          entry ./src/routes/async-host.js __html_f953a09c_0
        ./src/routes/async-mid.js 90 bytes [built] [code generated]
          [exports: default]
          [used exports unknown]
          import() ./async-mid.js ./src/routes/async-host.js 4:0-54
        ./src/routes/async-styled.js 60 bytes [built] [code generated]
          [exports: default]
          [used exports unknown]
          import() ./async-styled.js ./src/routes/async-mid.js 2:1-67
      asset modules 2 bytes (asset) 84 bytes (asset-url)
        ./src/fonts/inter.woff2 1 bytes (asset) 42 bytes (asset-url) [built] [code generated]
          [no exports]
          [used exports unknown]
          css url() ../fonts/inter.woff2 css ./src/styles/app.css 4:6-28
        ./src/fonts/inter.woff 1 bytes (asset) 42 bytes (asset-url) [built] [code generated]
          [no exports]
          [used exports unknown]
          css url() ../fonts/inter.woff css ./src/styles/app.css 5:6-27
    data:text/html,<!doctype html><html><head><script src="./src/routes/async-host.js"></script></hea...(truncated) 114 bytes (javascript) 104 bytes (html) [built] [code generated]
      [exports: default]
      [used exports unknown]
      entry data:text/html,<!doctype html><.. home
    css ./src/styles/app.css 181 bytes [built] [code generated]
      [no exports]
      [used exports unknown]
      harmony side effect evaluation ../styles/app.css ./src/routes/async-styled.js 1:0-27
  async-css-preload (webpack X.X.X) compiled successfully

auto-preconnect:
  asset runtime.a4154a99.js 6.64 KiB [emitted] [immutable] [javascript module] (name: runtime)
  asset home.6d8d52f7.js 1.39 KiB [emitted] [immutable] [javascript module] (name: home)
  asset __html_9b425bba_0.2e2af83c.chunk.js 1.26 KiB [emitted] [immutable] [javascript module] (name: __html_9b425bba_0)
  asset src_routes_settings_js.2107bc69.chunk.js 943 bytes [emitted] [immutable] [javascript module]
  asset home.b77f75b7.html 309 bytes [emitted] [immutable] (auxiliary name: home)
  Entrypoint home 8.03 KiB (309 bytes) = runtime.a4154a99.js 6.64 KiB home.6d8d52f7.js 1.39 KiB 1 auxiliary asset
  Entrypoint __html_9b425bba_0 7.9 KiB = runtime.a4154a99.js 6.64 KiB __html_9b425bba_0.2e2af83c.chunk.js 1.26 KiB
  runtime modules 3.62 KiB 8 modules
  cacheable modules 470 bytes (javascript) 98 bytes (html)
    data:text/html,<!doctype html><html><head><script src="./src/routes/home.js"></script></head><bod...(truncated) 108 bytes (javascript) 98 bytes (html) [built] [code generated]
      [exports: default]
      [used exports unknown]
      entry data:text/html,<!doctype html><.. home
    ./src/routes/home.js 328 bytes [built] [code generated]
      [used exports unknown]
      entry ./src/routes/home.js __html_9b425bba_0
    ./src/routes/settings.js 34 bytes [built] [code generated]
      [exports: default]
      [used exports unknown]
      import() ./settings.js ./src/routes/home.js 5:19-42
  auto-preconnect (webpack X.X.X) compiled successfully

object-form:
  assets by path assets/ 0 bytes
    assets by path assets/*.png 0 bytes
      asset assets/icon.31d6cfe0.png 0 bytes [emitted] [immutable] [from: src/icon.png] (auxiliary name: __html_545c7cf9_0)
      asset assets/thumb.31d6cfe0.png 0 bytes [emitted] [immutable] [from: src/thumb.png] (auxiliary name: __html_545c7cf9_0)
    asset assets/banner.31d6cfe0.jpg 0 bytes [emitted] [immutable] [from: src/hero/banner.jpg] (auxiliary name: __html_545c7cf9_0)
    asset assets/inter.31d6cfe0.woff2 0 bytes [emitted] [immutable] [from: src/fonts/inter.woff2] (auxiliary name: __html_545c7cf9_0)
  assets by path *.js 10.2 KiB
    asset runtime.87fc0bb3.js 4.25 KiB [emitted] [immutable] [javascript module] (name: runtime)
    asset __html_545c7cf9_0.4a6474cf.chunk.js 3.58 KiB [emitted] [immutable] [javascript module] (name: __html_545c7cf9_0)
    asset home.8518ca20.js 2.34 KiB [emitted] [immutable] [javascript module] (name: home)
  asset home.9538f127.html 1.18 KiB [emitted] [immutable] (auxiliary name: home)
  asset ssr-hints.json 673 bytes [emitted]
  Entrypoint home 6.59 KiB (1.18 KiB) = runtime.87fc0bb3.js 4.25 KiB home.8518ca20.js 2.34 KiB 1 auxiliary asset
  Entrypoint __html_545c7cf9_0 7.83 KiB = runtime.87fc0bb3.js 4.25 KiB __html_545c7cf9_0.4a6474cf.chunk.js 3.58 KiB 4 auxiliary assets
  runtime modules 1.94 KiB 6 modules
  cacheable modules 4 bytes (asset) 1.04 KiB (javascript) 110 bytes (html)
    asset modules 4 bytes (asset) 168 bytes (javascript)
      modules by path ./src/*.png 2 bytes (asset) 84 bytes (javascript)
        ./src/thumb.png 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
          [no exports]
          [used exports unknown]
          new URL() ../thumb.png ./src/routes/home-with-assets.js 8:14-54
        ./src/icon.png 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
          [no exports]
          [used exports unknown]
          new URL() ../icon.png ./src/routes/home-with-assets.js 11:21-14:1
      ./src/fonts/inter.woff2 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
        [no exports]
        [used exports unknown]
        new URL() ../fonts/inter.woff2 ./src/routes/home-with-assets.js 6:13-61
      ./src/hero/banner.jpg 1 bytes (asset) 42 bytes (javascript) [built] [code generated]
        [no exports]
        [used exports unknown]
        new URL() ../hero/banner.jpg ./src/routes/home-with-assets.js 7:13-59
    data:text/html,<!doctype html><html><head><script src="./src/routes/home-with-assets.js"></script...(truncated) 120 bytes (javascript) 110 bytes (html) [built] [code generated]
      [exports: default]
      [used exports unknown]
      entry data:text/html,<!doctype html><.. home
    ./src/routes/home-with-assets.js 778 bytes [built] [code generated]
      [used exports unknown]
      entry ./src/routes/home-with-assets.js __html_545c7cf9_0
  object-form (webpack X.X.X) compiled successfully

csp-no-polyfill:
  asset runtime.34e66c4f.js 11 KiB [emitted] [immutable] [javascript module] (name: runtime)
  asset home.88328dd2.js 1.17 KiB [emitted] [immutable] [javascript module] (name: home)
  asset __html_9b425bba_0.7fa16e80.chunk.js 1.09 KiB [emitted] [immutable] [javascript module] (name: __html_9b425bba_0)
  asset src_routes_settings_js.c8a41bd7.chunk.js 866 bytes [emitted] [immutable] [javascript module]
  asset home.c76a1b84.html 237 bytes [emitted] [immutable] (auxiliary name: home)
  Entrypoint home 12.2 KiB (237 bytes) = runtime.34e66c4f.js 11 KiB home.88328dd2.js 1.17 KiB 1 auxiliary asset
  Entrypoint __html_9b425bba_0 12.1 KiB = runtime.34e66c4f.js 11 KiB __html_9b425bba_0.7fa16e80.chunk.js 1.09 KiB
  runtime modules 6.99 KiB 9 modules
  cacheable modules 470 bytes (javascript) 98 bytes (html)
    data:text/html,<!doctype html><html><head><script src="./src/routes/home.js"></script></head><bod...(truncated) 108 bytes (javascript) 98 bytes (html) [built] [code generated]
      [exports: default]
      [used exports unknown]
      entry data:text/html,<!doctype html><.. home
    ./src/routes/home.js 328 bytes [built] [code generated]
      [used exports unknown]
      entry ./src/routes/home.js __html_9b425bba_0
    ./src/routes/settings.js 34 bytes [built] [code generated]
      [exports: default]
      [used exports unknown]
      import() ./settings.js ./src/routes/home.js 5:19-42
  csp-no-polyfill (webpack X.X.X) compiled successfully

async-js-css-preload:
  assets by path *.js 18.5 KiB
    asset runtime.b157f8b1.js 13.9 KiB [emitted] [immutable] [javascript module] (name: runtime)
    asset home.b596a374.js 1.33 KiB [emitted] [immutable] [javascript module] (name: home)
    asset __html_f953a09c_0.c1556bc8.chunk.js 1.22 KiB [emitted] [immutable] [javascript module] (name: __html_f953a09c_0)
    asset mid.8851ee6b.chunk.js 1.14 KiB [emitted] [immutable] [javascript module] (name: mid)
    asset styled-route.89138c94.chunk.js 934 bytes [emitted] [immutable] [javascript module] (name: styled-route)
  assets by chunk 0 bytes (auxiliary name: styled-route)
    asset 31d6cfe0d16ae931b73c.woff 0 bytes [emitted] [immutable] [from: src/fonts/inter.woff] (auxiliary name: styled-route)
    asset 31d6cfe0d16ae931b73c.woff2 0 bytes [emitted] [immutable] [from: src/fonts/inter.woff2] (auxiliary name: styled-route)
  asset styled-route.84a7fce8.chunk.css 313 bytes [emitted] [immutable] (name: styled-route)
  asset home.783c7765.html 237 bytes [emitted] [immutable] (auxiliary name: home)
  Entrypoint home 15.3 KiB (237 bytes) = runtime.b157f8b1.js 13.9 KiB home.b596a374.js 1.33 KiB 1 auxiliary asset
  Entrypoint __html_f953a09c_0 15.2 KiB = runtime.b157f8b1.js 13.9 KiB __html_f953a09c_0.c1556bc8.chunk.js 1.22 KiB
  runtime modules 8.92 KiB 13 modules
  cacheable modules 574 bytes (javascript) 2 bytes (asset) 84 bytes (asset-url) 104 bytes (html) 181 bytes (css)
    modules by path ./src/ 460 bytes (javascript) 2 bytes (asset) 84 bytes (asset-url)
      javascript modules 460 bytes
        ./src/routes/async-host.js 310 bytes [built] [code generated]
          [used exports unknown]
          entry ./src/routes/async-host.js __html_f953a09c_0
        ./src/routes/async-mid.js 90 bytes [built] [code generated]
          [exports: default]
          [used exports unknown]
          import() ./async-mid.js ./src/routes/async-host.js 4:0-54
        ./src/routes/async-styled.js 60 bytes [built] [code generated]
          [exports: default]
          [used exports unknown]
          import() ./async-styled.js ./src/routes/async-mid.js 2:1-67
      asset modules 2 bytes (asset) 84 bytes (asset-url)
        ./src/fonts/inter.woff2 1 bytes (asset) 42 bytes (asset-url) [built] [code generated]
          [no exports]
          [used exports unknown]
          css url() ../fonts/inter.woff2 css ./src/styles/app.css 4:6-28
        ./src/fonts/inter.woff 1 bytes (asset) 42 bytes (asset-url) [built] [code generated]
          [no exports]
          [used exports unknown]
          css url() ../fonts/inter.woff css ./src/styles/app.css 5:6-27
    data:text/html,<!doctype html><html><head><script src="./src/routes/async-host.js"></script></hea...(truncated) 114 bytes (javascript) 104 bytes (html) [built] [code generated]
      [exports: default]
      [used exports unknown]
      entry data:text/html,<!doctype html><.. home
    css ./src/styles/app.css 181 bytes [built] [code generated]
      [no exports]
      [used exports unknown]
      harmony side effect evaluation ../styles/app.css ./src/routes/async-styled.js 1:0-27
  async-js-css-preload (webpack X.X.X) compiled successfully

esm-default:
  asset runtime.a4154a99.js 6.64 KiB [emitted] [immutable] [javascript module] (name: runtime)
  asset home.6d8d52f7.js 1.31 KiB [emitted] [immutable] [javascript module] (name: home)
  asset __html_9b425bba_0.2e2af83c.chunk.js 1.26 KiB [emitted] [immutable] [javascript module] (name: __html_9b425bba_0)
  asset src_routes_settings_js.2107bc69.chunk.js 943 bytes [emitted] [immutable] [javascript module]
  asset home.6a0b13a2.html 237 bytes [emitted] [immutable] (auxiliary name: home)
  Entrypoint home 7.95 KiB (237 bytes) = runtime.a4154a99.js 6.64 KiB home.6d8d52f7.js 1.31 KiB 1 auxiliary asset
  Entrypoint __html_9b425bba_0 7.9 KiB = runtime.a4154a99.js 6.64 KiB __html_9b425bba_0.2e2af83c.chunk.js 1.26 KiB
  runtime modules 3.62 KiB 8 modules
  cacheable modules 470 bytes (javascript) 98 bytes (html)
    data:text/html,<!doctype html><html><head><script src="./src/routes/home.js"></script></head><bod...(truncated) 108 bytes (javascript) 98 bytes (html) [built] [code generated]
      [exports: default]
      [used exports unknown]
      entry data:text/html,<!doctype html><.. home
    ./src/routes/home.js 328 bytes [built] [code generated]
      [used exports unknown]
      entry ./src/routes/home.js __html_9b425bba_0
    ./src/routes/settings.js 34 bytes [built] [code generated]
      [exports: default]
      [used exports unknown]
      import() ./settings.js ./src/routes/home.js 5:19-42
  esm-default (webpack X.X.X) compiled successfully
```
