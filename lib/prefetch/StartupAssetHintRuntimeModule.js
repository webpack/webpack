/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const CssUrlDependency = require("../dependencies/CssUrlDependency");
const HtmlSourceDependency = require("../dependencies/HtmlSourceDependency");
const URLDependency = require("../dependencies/URLDependency");
const ResourceHintRuntimeModule = require("./ResourceHintRuntimeModule");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */

/**
 * Fires `<link rel="prefetch">` / `<link rel="preload">` for every asset
 * referenced from this chunk via `new URL(..., import.meta.url)` carrying
 * `webpackPrefetch` / `webpackPreload`, at chunk startup. Runs before any
 * user module evaluates, so by the time user code reaches the
 * corresponding `new URL(...)` (or hands the URL to `<img>`, `fetch`,
 * `new Worker`, etc.), the browser already has the response in flight.
 */
class StartupAssetHintRuntimeModule extends RuntimeModule {
	constructor() {
		super("startup asset hints", RuntimeModule.STAGE_TRIGGER);
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const chunkGraph = /** @type {ChunkGraph} */ (this.chunkGraph);
		const moduleGraph = /** @type {ModuleGraph} */ (compilation.moduleGraph);
		const runtimeTemplate = compilation.runtimeTemplate;
		const chunk = /** @type {Chunk} */ (this.chunk);
		const runtimeRequirements =
			/** @type {Set<string>} */
			(chunkGraph.getTreeRuntimeRequirements(chunk));

		// Dedupe per asset module: if the same asset is referenced twice
		// (e.g. CSS rule says `prefetch`, a JS magic comment says
		// `preload`), pick `preload` over `prefetch` and keep the most
		// recently seen explicit attribute overrides. Avoids emitting a
		// duplicate `<link>` and ordering-dependent winners.
		/**
		 * @typedef {object} AssetHintEntry
		 * @property {import("../Module")} assetModule
		 * @property {string} request
		 * @property {boolean} preload
		 * @property {("low" | "high" | "auto" | undefined)} fetchPriority
		 * @property {(string | undefined)} as
		 * @property {(string | undefined)} type
		 * @property {(string | undefined)} media
		 */
		// Per-asset dedupe vs the HTML-head emission by `HtmlEntryDependency`:
		// if the asset is reachable from an HTML entrypoint's chunks, its
		// `<link>` lands in that HTML `<head>` already — skip the runtime
		// hint for that asset so the DOM doesn't carry two tags for one URL.
		// Set is computed once per compilation from the module graph (stable
		// across cache reads), never from a mutable cross-module marker.
		const ResourceHintPlugin = require("./ResourceHintPlugin");

		// `output.resourceHints: "none"` is a hard off switch — the plugin's
		// runtime-requirements hook already skips adding this module then, so no
		// `"none"` guard is needed here.
		const { isHtmlHinted } =
			ResourceHintPlugin.getCompilationResolver(compilation);

		/** @type {Map<string, AssetHintEntry>} */
		const perAsset = new Map();
		for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
			const deps =
				/** @type {{ dependencies?: import("../Dependency")[] }} */
				(module).dependencies;
			if (!deps) continue;
			for (const dep of deps) {
				if (
					!(dep instanceof URLDependency) &&
					!(dep instanceof CssUrlDependency) &&
					!(dep instanceof HtmlSourceDependency)
				) {
					continue;
				}
				if (!dep.prefetch && !dep.preload) continue;
				const assetModule = moduleGraph.getModule(dep);
				if (!assetModule) continue;
				if (isHtmlHinted(assetModule)) continue;
				const key = assetModule.identifier();
				const urlDep =
					/** @type {URLDependency & Partial<CssUrlDependency> & Partial<HtmlSourceDependency>} */
					(dep);
				const existing = perAsset.get(key);
				if (existing) {
					if (dep.preload) existing.preload = true;
					if (dep.fetchPriority) existing.fetchPriority = dep.fetchPriority;
					if (urlDep.asAttribute) existing.as = urlDep.asAttribute;
					if (urlDep.typeAttribute) existing.type = urlDep.typeAttribute;
					if (urlDep.mediaAttribute) existing.media = urlDep.mediaAttribute;
				} else {
					perAsset.set(key, {
						assetModule: /** @type {Module} */ (assetModule),
						request: dep.request,
						preload: Boolean(dep.preload),
						fetchPriority: dep.fetchPriority,
						as: urlDep.asAttribute,
						type: urlDep.typeAttribute,
						media: urlDep.mediaAttribute
					});
				}
			}
		}
		const lines = [];
		for (const entry of perAsset.values()) {
			const fn = entry.preload
				? RuntimeGlobals.preloadAsset
				: RuntimeGlobals.prefetchAsset;
			// For CSS-only assets (referenced from `url(...)` but never
			// from JS) the module produces no JS source, so
			// `__webpack_require__(id)` would throw at runtime. Use the
			// emitted filename + publicPath directly in that case; asset
			// modules referenced from JS stay on the existing `moduleRaw`
			// path which yields the same URL.
			const hasJsSourceType = entry.assetModule
				.getSourceTypes()
				.has("javascript");
			let hrefExpr;
			if (hasJsSourceType) {
				hrefExpr = runtimeTemplate.moduleRaw({
					chunkGraph,
					module: entry.assetModule,
					request: entry.request,
					runtimeRequirements,
					weak: false
				});
			} else {
				const buildInfo =
					/** @type {{ filename?: string }} */
					(entry.assetModule.buildInfo);
				if (!buildInfo || !buildInfo.filename) continue;
				runtimeRequirements.add(RuntimeGlobals.publicPath);
				hrefExpr = `${RuntimeGlobals.publicPath} + ${JSON.stringify(buildInfo.filename)}`;
			}
			const as =
				entry.as || ResourceHintRuntimeModule.guessAsAttribute(entry.request);
			lines.push(
				`${fn}(${hrefExpr}, ${JSON.stringify(as)}, ${
					entry.type ? JSON.stringify(entry.type) : "undefined"
				}, ${entry.media ? JSON.stringify(entry.media) : "undefined"}, ${
					entry.fetchPriority
						? JSON.stringify(entry.fetchPriority)
						: "undefined"
				});`
			);
		}
		if (lines.length === 0) return null;
		// `__webpack_nonce__` set inside the entry module is too late — the
		// entry hasn't run yet. Read the nonce off the `<script>` tag that
		// loaded the bundle, so prefetch / preload links match a CSP that
		// demands the same nonce as the script.
		//
		// - For classic script output, `document.currentScript` is the
		//   loading `<script>` element while the runtime executes.
		// - For ESM output (`output.module: true`), `document.currentScript`
		//   is `null`; locate the loading `<script type="module">` by
		//   matching `script.src` against `import.meta.url`.
		const { module: isModule, importMetaName } = compilation.outputOptions;
		const nonceSetup = isModule
			? [
					"if (typeof document !== 'undefined') {",
					Template.indent([
						`var url = ${importMetaName}.url;`,
						"var scripts = document.getElementsByTagName('script');",
						"for (var i = 0; i < scripts.length; i++) {",
						Template.indent([
							`if (scripts[i].src === url && scripts[i].nonce && !${RuntimeGlobals.scriptNonce}) {`,
							Template.indent([
								`${RuntimeGlobals.scriptNonce} = scripts[i].nonce;`,
								"break;"
							]),
							"}"
						]),
						"}"
					]),
					"}"
				]
			: [
					"if (typeof document !== 'undefined') {",
					Template.indent([
						"var currentScript = document.currentScript;",
						`if (currentScript && currentScript.nonce && !${RuntimeGlobals.scriptNonce}) {`,
						Template.indent(
							`${RuntimeGlobals.scriptNonce} = currentScript.nonce;`
						),
						"}"
					]),
					"}"
				];
		return Template.asString([...nonceSetup, ...lines]);
	}
}

module.exports = StartupAssetHintRuntimeModule;
