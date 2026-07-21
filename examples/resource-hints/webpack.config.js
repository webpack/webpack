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
