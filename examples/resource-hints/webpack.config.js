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
	 * `output.resourceHintsManifest` writes the result to a JSON file
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
			resourceHints: ({ defaultHints }) =>
				defaultHints.map((d) =>
					d.hostChunks.includes("runtime") ? { ...d, fetchPriority: "high" } : d
				),
			resourceHintsManifest: "ssr-hints.json"
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
	 * 10. GLOBAL URL HINTS — `output.urlHints` is a project-wide shorthand for
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
			resourceHints: true,
			urlHints: [
				{ test: /\.woff2$/, preload: true, as: "font", fetchPriority: "high" },
				{ test: /\.(png|jpg|webp)$/, prefetch: true, fetchPriority: "low" }
			]
		},
		module: {
			rules: [{ test: /\.(png|jpg|webp|woff2)$/, type: "asset/resource" }]
		},
		optimization: { runtimeChunk: "single", chunkIds: "named" },
		experiments: { html: true, outputModule: true }
	}
];
