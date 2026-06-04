/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const ModuleFilenameHelpers = require("../ModuleFilenameHelpers");
const RuntimeGlobals = require("../RuntimeGlobals");
const CssUrlDependency = require("../dependencies/CssUrlDependency");
const HtmlSourceDependency = require("../dependencies/HtmlSourceDependency");
const URLDependency = require("../dependencies/URLDependency");
const ResourceHintRuntimeModule = require("./ResourceHintRuntimeModule");
const StartupAssetHintRuntimeModule = require("./StartupAssetHintRuntimeModule");
const parseResourceHintOptions = require("./parseResourceHintOptions");

/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../../declarations/WebpackOptions").ResourceHints} ResourceHintsConfig */
/** @typedef {import("../../declarations/WebpackOptions").ResourceHintsObject} ResourceHintsObject */
/** @typedef {import("../../declarations/WebpackOptions").ResourceHintsAsset} ResourceHintsAsset */
/** @typedef {import("../dependencies/HtmlEntryDependency").HtmlResourceHint} HtmlResourceHint */
/** @typedef {import("../dependencies/HtmlEntryDependency").HtmlResourceHintContext} HtmlResourceHintContext */

/** @typedef {import("./parseResourceHintOptions").ResourceHintOptions} ResourceHintOptions */

/**
 * @typedef {object} ResolvedResourceHints
 * @property {boolean=} prefetch project-wide default for `webpackPrefetch`
 * @property {boolean=} preload project-wide default for `webpackPreload`
 * @property {("low" | "high" | "auto" | false)=} fetchPriority project-wide default for `webpackFetchPriority`
 */

/**
 * A URL-referenced-asset dependency that can carry resource-hint state.
 * `URLDependency`, `CssUrlDependency` and `HtmlSourceDependency` all share
 * these field names — the `applyResourceHints` statics mutate them in place.
 * @typedef {object} ResourceHintDep
 * @property {true | undefined} prefetch
 * @property {true | undefined} preload
 * @property {("low" | "high" | "auto" | undefined)} fetchPriority
 * @property {string | undefined} asAttribute
 * @property {string | undefined} typeAttribute
 * @property {string | undefined} mediaAttribute
 */

/**
 * A URL-referenced asset an HTML entry should emit as `<link>` in its `<head>`.
 * @typedef {object} HtmlHintedAsset
 * @property {Module} module the asset module (source-of-truth for the URL)
 * @property {ResourceHintDep} dep the URL/CSS/HTML source dep carrying the hint flags
 */

/**
 * A resolved resource-hint descriptor emitted for an entrypoint — the shape
 * consumed by `stats.entrypoints[name].resourceHints` and by SSR frameworks
 * that render the initial HTML themselves.
 * @typedef {object} EntrypointHint
 * @property {"preload" | "prefetch" | "modulepreload"} rel
 * @property {string} href emitted URL (public path applied)
 * @property {string=} as
 * @property {string=} type
 * @property {string=} media
 * @property {("low" | "high" | "auto")=} fetchPriority
 */

/**
 * @typedef {object} ResolveDependenciesContext
 * @property {string} entryName the entrypoint name driving this emission
 * @property {"html" | "js"} hostType `"html"` when the entrypoint has an extracted HTML page (the descriptors will land in its `<head>`); `"js"` otherwise (SSR framework will inject them, e.g. from `stats.entrypoints[entryName].resourceHints`)
 * @property {import("../Compilation")} compilation
 */

/**
 * @callback ResolveDependenciesFn
 * @param {EntrypointHint[]} deps combined chunk + asset URL descriptors this entry would emit
 * @param {ResolveDependenciesContext} context
 * @returns {EntrypointHint[]} rewritten list (empty array = drop all)
 */

/**
 * @typedef {object} CompilationResolver
 * @property {(request: string) => ResolvedResourceHints} resolveAsset per-asset URL rule resolver (`output.resourceHints.assets`)
 * @property {ResourceHintsObject["chunks"]} chunks `output.resourceHints.chunks` (`undefined` when unset)
 * @property {(entryName: string) => HtmlHintedAsset[]} getHtmlHinted URL asset descriptors reachable from an HTML entrypoint's initial chunks — `HtmlEntryDependency` template consumes this list to emit `<link>` tags into the extracted HTML `<head>`
 * @property {(assetModule: Module) => boolean} isHtmlHinted true when `assetModule` appears in *any* HTML entry's hinted list — the JS chunk-startup runtime skips it so the DOM never carries two tags for one URL
 * @property {(entryName: string) => EntrypointHint[]} getEntrypointHints resolved `<link>`-shaped descriptors for the given entry: initial-chunk hints from `output.resourceHints.chunks` + URL asset hints from `output.resourceHints.assets` / magic comments. Works for both HTML and JS-only entries (JS-only frameworks read this from `stats.entrypoints[name].resourceHints` to inject the hints server-side)
 */

const PLUGIN_NAME = "ResourceHintPlugin";

/** @type {WeakMap<Compilation, CompilationResolver>} */
const compilationResolvers = new WeakMap();

/**
 * Split the top-level `output.resourceHints` value into `{ chunks, assetRules }`.
 * `true` maps to `{ chunks: true }` (auto initial-graph modulepreload for HTML
 * entries); `false` and `undefined` yield empty defaults. An object passes
 * through with `assets` folded into a rules array.
 * @param {ResourceHintsConfig | undefined} config user config
 * @returns {{ chunks: ResourceHintsObject["chunks"], assetRules: ResourceHintsAsset[], resolveDependencies: ResolveDependenciesFn | undefined }} normalized
 */
const normalize = (config) => {
	if (config === undefined || config === false) {
		return {
			chunks: undefined,
			assetRules: [],
			resolveDependencies: undefined
		};
	}
	if (config === true) {
		return { chunks: true, assetRules: [], resolveDependencies: undefined };
	}
	const assets = config.assets;
	/** @type {ResourceHintsAsset[]} */
	const assetRules =
		assets === undefined ? [] : Array.isArray(assets) ? assets : [assets];
	return {
		chunks: config.chunks,
		assetRules,
		resolveDependencies: config.resolveDependencies
	};
};

// Sane default-exclude: manifests, PDFs, plain text are almost never wanted
// as `<link rel="preload/prefetch">` targets. Explicit `webpackPrefetch` /
// `webpackPreload` magic comments on individual URLs still work — they route
// through the parser, not this rule resolver.
const DEFAULT_ASSETS_EXCLUDE_REGEXP = /\.(?:webmanifest|pdf|txt)(?:\?.*)?$/i;

/**
 * Builds a per-asset resolver that returns the merged defaults for a given
 * asset request. Iterates the rules in order; matching rules merge their hint
 * fields, with later matches overriding earlier ones for non-`undefined` fields.
 * @param {ResourceHintsAsset[]} rules normalized rules
 * @returns {(request: string) => ResolvedResourceHints} resolver
 */
const createAssetResolver = (rules) => {
	if (rules.length === 0) return () => ({});
	return (request) => {
		if (DEFAULT_ASSETS_EXCLUDE_REGEXP.test(request)) return {};
		/** @type {ResolvedResourceHints} */
		const merged = {};
		for (const rule of rules) {
			if (
				(rule.test !== undefined ||
					rule.include !== undefined ||
					rule.exclude !== undefined) &&
				!ModuleFilenameHelpers.matchObject(
					/** @type {EXPECTED_ANY} */ ({
						test: rule.test,
						include: rule.include,
						exclude: rule.exclude
					}),
					request
				)
			) {
				continue;
			}
			if (rule.prefetch !== undefined) merged.prefetch = rule.prefetch;
			if (rule.preload !== undefined) merged.preload = rule.preload;
			if (rule.fetchPriority !== undefined) {
				merged.fetchPriority = rule.fetchPriority;
			}
		}
		return merged;
	};
};

/**
 * Collect the resolved `<link>`-shaped hint descriptors for an entrypoint —
 * combining the `chunks` channel (initial-graph modulepreload/preload/prefetch)
 * with the `assets` channel (URL-referenced fonts/images/…). Backs
 * `stats.entrypoints[name].resourceHints`. Works for any entrypoint, HTML or
 * JS-only — SSR frameworks read this to inject `<link>` server-side without a
 * separate manifest.
 * @param {import("../Compilation")} compilation compilation
 * @param {string} entryName entrypoint name
 * @param {ResourceHintsObject["chunks"]} chunksMode `output.resourceHints.chunks`
 * @param {ResolveDependenciesFn=} resolveDependencies user filter/rewrite hook (`output.resourceHints.resolveDependencies`)
 * @returns {EntrypointHint[]} descriptors
 */
const collectEntrypointHints = (
	compilation,
	entryName,
	chunksMode,
	resolveDependencies
) => {
	const entrypoint = compilation.entrypoints.get(entryName);
	if (!entrypoint) return [];
	/** @type {EntrypointHint[]} */
	const out = [];
	/** @type {Set<string>} */
	const seenKeys = new Set();
	const push = (/** @type {EntrypointHint} */ h) => {
		const key = `${h.rel}\0${h.href}`;
		if (seenKeys.has(key)) return;
		seenKeys.add(key);
		out.push(h);
	};
	const publicPath =
		typeof compilation.outputOptions.publicPath === "string" &&
		compilation.outputOptions.publicPath !== "auto"
			? compilation.outputOptions.publicPath
			: "";
	// Chunks channel — auto initial-graph hints, mirroring HtmlEntry's default
	// mode. Custom array/function forms are HTML-only (they need the
	// per-page callback context), so they're intentionally not enumerated here.
	if (
		chunksMode === true ||
		chunksMode === "preload" ||
		chunksMode === "prefetch"
	) {
		const isModuleOutput = compilation.outputOptions.module === true;
		const prefetch = chunksMode === "prefetch";
		const rel = prefetch
			? "prefetch"
			: isModuleOutput
				? "modulepreload"
				: "preload";
		const entryChunk = entrypoint.getEntrypointChunk();
		for (const chunk of entrypoint.chunks) {
			if (chunk === entryChunk) continue;
			for (const file of chunk.files) {
				if (!/\.m?jsx?$/i.test(file)) continue;
				const href = publicPath + file;
				/** @type {EntrypointHint} */
				const h = { rel, href };
				if (rel === "preload") h.as = "script";
				push(h);
			}
		}
	}
	// Assets channel — URL-referenced deps carrying prefetch/preload. Walk
	// entrypoint's initial chunks × modules × deps (async chunks are handled
	// by the on-demand runtime via `dynamicImportPrefetch/Preload` parser
	// options, so they're deliberately excluded here).
	/** @type {Set<import("../Chunk")>} */
	const chunkSet = new Set(entrypoint.chunks);
	const rt = entrypoint.getRuntimeChunk();
	if (rt) chunkSet.add(rt);
	/** @type {WeakSet<Module>} */
	const seenAssets = new WeakSet();
	for (const chunk of chunkSet) {
		for (const m of compilation.chunkGraph.getChunkModulesIterable(chunk)) {
			if (!m.dependencies) continue;
			for (const d of m.dependencies) {
				if (
					!(d instanceof URLDependency) &&
					!(d instanceof CssUrlDependency) &&
					!(d instanceof HtmlSourceDependency)
				) {
					continue;
				}
				if (!d.prefetch && !d.preload) continue;
				const t = compilation.moduleGraph.getModule(d);
				if (!t || seenAssets.has(t)) continue;
				seenAssets.add(t);
				const buildInfo =
					/** @type {{ filename?: string }} */
					(t.buildInfo);
				if (!buildInfo || !buildInfo.filename) continue;
				const asAttr =
					d.asAttribute ||
					ResourceHintRuntimeModule.guessAsAttribute(d.request);
				/** @type {EntrypointHint} */
				const h = {
					rel: d.preload ? "preload" : "prefetch",
					href: publicPath + buildInfo.filename
				};
				if (asAttr) h.as = asAttr;
				if (d.typeAttribute) h.type = d.typeAttribute;
				if (d.mediaAttribute) h.media = d.mediaAttribute;
				if (d.fetchPriority) h.fetchPriority = d.fetchPriority;
				push(h);
			}
		}
	}
	if (!resolveDependencies) return out;
	// Vite-style escape hatch. `hostType` = `"html"` iff the entrypoint has an
	// extracted HTML page (any `HtmlEntryDependency` with elementKind `script`
	// / `script-module` on any HTML module points at this entryName); SSR
	// frameworks reading `stats.entrypoints[name].resourceHints` see `"js"`.
	let hostType = /** @type {"html" | "js"} */ ("js");

	const HtmlEntryDependency = require("../dependencies/HtmlEntryDependency");

	outer: for (const module of compilation.modules) {
		if (!module.getSourceTypes || !module.getSourceTypes().has("html")) {
			continue;
		}
		const presDeps = module.presentationalDependencies;
		if (!presDeps) continue;
		for (const dep of presDeps) {
			if (
				dep instanceof HtmlEntryDependency &&
				dep.entryName === entryName &&
				(dep.elementKind === "script" || dep.elementKind === "script-module")
			) {
				hostType = "html";
				break outer;
			}
		}
	}
	return resolveDependencies(out, { entryName, hostType, compilation }) || [];
};

/**
 * Adds runtime support for `__webpack_require__.PA` / `__webpack_require__.LA`,
 * the helpers that inject `<link rel="prefetch">` / `<link rel="preload">`
 * tags for asset modules referenced via `new URL(..., import.meta.url)`, CSS
 * `url(...)`, and HTML `<img src>` / `<link href>`. Also stores the `chunks`
 * channel (initial-graph modulepreload) so `HtmlEntryDependency` can emit its
 * `<link>` tags into the extracted HTML `<head>`.
 */
class ResourceHintPlugin {
	/**
	 * @param {ResourceHintsConfig=} options unified `output.resourceHints`
	 */
	constructor(options) {
		const { chunks, assetRules, resolveDependencies } = normalize(options);
		/** @type {ResourceHintsObject["chunks"]} */
		this._chunks = chunks;
		/** @type {ResourceHintsAsset[]} */
		this._assetRules = assetRules;
		/** @type {ResolveDependenciesFn | undefined} */
		this._resolveDependencies = resolveDependencies;
	}

	/**
	 * Returns the per-compilation resolver. Callers use `.resolveAsset(request)`
	 * to look up rule-derived defaults for a URL-referenced asset, `.chunks` to
	 * read the initial-chunk-preload setting, and `.isHtmlHinted(assetModule)`
	 * to check whether an HTML entry already emits this asset's `<link>`.
	 * @param {Compilation} compilation compilation
	 * @returns {CompilationResolver} resolver
	 */
	static getCompilationResolver(compilation) {
		const entry = compilationResolvers.get(compilation);
		if (entry) return entry;
		return {
			resolveAsset: () => ({}),
			chunks: undefined,
			getHtmlHinted: () => [],
			isHtmlHinted: () => false,
			getEntrypointHints: () => []
		};
	}

	/**
	 * Apply `output.resourceHints.assets` rule defaults to a URL asset dep.
	 * Used from URL-emitting parsers when they have per-request defaults but
	 * no comment options to parse (e.g. the HTML parser's `pendingHints`
	 * flow, where the comment was parsed earlier).
	 * @param {ResourceHintDep} dep dep to mutate
	 * @param {ResolvedResourceHints} defaults `resolveAsset(request)` result
	 * @returns {void}
	 */
	static applyDefaults(dep, defaults) {
		if (defaults.prefetch) dep.prefetch = true;
		if (defaults.preload) dep.preload = true;
		if (defaults.fetchPriority) dep.fetchPriority = defaults.fetchPriority;
	}

	/**
	 * Apply already-parsed `webpackPrefetch` / `webpackPreload` /
	 * `webpackFetchPriority` / `webpackAs` / `webpackType` / `webpackMedia`
	 * overrides to a URL asset dep. Each field wins over the project-wide
	 * default only when it's explicitly set on the magic comment.
	 * @param {ResourceHintDep} dep dep to mutate
	 * @param {ResourceHintOptions} hints parsed hint options
	 * @returns {void}
	 */
	static applyParsedHints(dep, hints) {
		if (hints.prefetch !== undefined) dep.prefetch = hints.prefetch;
		if (hints.preload !== undefined) dep.preload = hints.preload;
		if (hints.fetchPriority !== undefined) {
			dep.fetchPriority = hints.fetchPriority;
		}
		if (hints.as !== undefined) dep.asAttribute = hints.as;
		if (hints.type !== undefined) dep.typeAttribute = hints.type;
		if (hints.media !== undefined) dep.mediaAttribute = hints.media;
	}

	/**
	 * Apply `output.resourceHints.assets` rule defaults + per-URL magic-comment
	 * overrides to a URL asset dep. Called from every URL-emitting parser (JS
	 * `new URL(...)`, CSS `url(...)`, HTML `<img src>` / `<link href>`,
	 * `new Worker(new URL(...))`) so all sources share the same precedence:
	 * rule defaults first, magic comments win.
	 * @param {ResourceHintDep} dep dep to mutate in place
	 * @param {ResolvedResourceHints} defaults `resolveAsset(request)` result
	 * @param {Record<string, EXPECTED_ANY> | null | undefined} commentOptions parsed magic-comment options (`null` / `undefined` skips override phase)
	 * @param {import("../NormalModule")} module module for emitting warnings on invalid comments
	 * @param {import("../Dependency").DependencyLocation} loc loc for warnings
	 * @returns {void}
	 */
	static applyResourceHints(dep, defaults, commentOptions, module, loc) {
		ResourceHintPlugin.applyDefaults(dep, defaults);
		if (!commentOptions) return;
		ResourceHintPlugin.applyParsedHints(
			dep,
			parseResourceHintOptions(commentOptions, module, loc)
		);
	}

	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const resolveAsset = createAssetResolver(this._assetRules);
		const chunks = this._chunks;

		const HtmlEntryDependency = require("../dependencies/HtmlEntryDependency");

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			// Lazy-computed on first access — walk every HTML module's
			// `HtmlEntryDependency`s, resolve each named entry, and collect
			// every URL asset dep target reachable from its ordered chunks.
			// One pass produces two views: a per-entry list (consumed by
			// `HtmlEntryDependency.Template` to emit `<link>` tags) and a
			// global `WeakSet` (consumed by `StartupAssetHintRuntimeModule`
			// to skip the JS runtime `<link>` for the same asset).
			// Deterministic (module graph is fixed by seal time) and cheap
			// (only fires when a JS chunk actually produces hints).
			/** @type {Map<string, HtmlHintedAsset[]> | undefined} */
			let perEntry;
			/** @type {WeakSet<Module> | undefined} */
			let anyHtmlHinted;
			const build = () => {
				perEntry = new Map();
				anyHtmlHinted = new WeakSet();
				for (const module of compilation.modules) {
					if (!module.getSourceTypes || !module.getSourceTypes().has("html")) {
						continue;
					}
					// HtmlEntry deps live on `presentationalDependencies` (added
					// by the HTML parser via `addPresentationalDependency`) —
					// they don't affect module resolution, only rendering.
					const presDeps = module.presentationalDependencies;
					if (!presDeps) continue;
					for (const dep of presDeps) {
						if (
							!(dep instanceof HtmlEntryDependency) ||
							(dep.elementKind !== "script" &&
								dep.elementKind !== "script-module")
						) {
							continue;
						}
						const entrypoint = compilation.entrypoints.get(dep.entryName);
						if (!entrypoint) continue;
						// Mirror `getEntrypointChunksInLoadOrder`: entry chunk +
						// runtime chunk + all initial siblings (`entrypoint.chunks`
						// includes splitChunks output). Async `import()` chunks
						// stay on the on-demand runtime and are NOT HTML-hinted.
						/** @type {Set<import("../Chunk")>} */
						const chunks = new Set(entrypoint.chunks);
						const entry = entrypoint.getEntrypointChunk();
						if (entry) chunks.add(entry);
						const rt = entrypoint.getRuntimeChunk();
						if (rt) chunks.add(rt);
						/** @type {HtmlHintedAsset[]} */
						const hinted = [];
						/** @type {WeakSet<Module>} */
						const seen = new WeakSet();
						for (const c of chunks) {
							for (const m of compilation.chunkGraph.getChunkModulesIterable(
								c
							)) {
								if (!m.dependencies) continue;
								for (const d of m.dependencies) {
									if (
										!(d instanceof URLDependency) &&
										!(d instanceof CssUrlDependency) &&
										!(d instanceof HtmlSourceDependency)
									) {
										continue;
									}
									if (!d.prefetch && !d.preload) continue;
									const t = compilation.moduleGraph.getModule(d);
									if (!t || seen.has(t)) continue;
									seen.add(t);
									anyHtmlHinted.add(t);
									hinted.push({ module: t, dep: d });
								}
							}
						}
						// Multiple HtmlEntryDeps may share an entryName (e.g. a
						// `<script>` and a `<link rel="modulepreload">` for the
						// same chunk). Merge lists so no asset is duplicated.
						const existing = perEntry.get(dep.entryName);
						if (existing) {
							for (const h of hinted) existing.push(h);
						} else {
							perEntry.set(dep.entryName, hinted);
						}
					}
				}
			};
			compilationResolvers.set(compilation, {
				resolveAsset,
				chunks,
				getHtmlHinted: (entryName) => {
					if (!perEntry) build();
					return (
						/** @type {Map<string, HtmlHintedAsset[]>} */ (perEntry).get(
							entryName
						) || []
					);
				},
				isHtmlHinted: (assetModule) => {
					if (!anyHtmlHinted) build();
					return /** @type {WeakSet<Module>} */ (anyHtmlHinted).has(
						assetModule
					);
				},
				getEntrypointHints: (entryName) =>
					collectEntrypointHints(
						compilation,
						entryName,
						chunks,
						this._resolveDependencies
					)
			});
			// CSS `url(...)` and HTML `<img src>` / `<link href>` deps store
			// hint flags but their dep templates don't run for the JS
			// output, so we need to lift those flags into the JS chunk's
			// runtime requirements ourselves. Iterate only css/html modules
			// (pure-JS chunks skip the walk entirely).
			compilation.hooks.additionalChunkRuntimeRequirements.tap(
				PLUGIN_NAME,
				(chunk, set, { chunkGraph }) => {
					let hasPrefetch = false;
					let hasPreload = false;
					for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
						const deps =
							/** @type {{ dependencies?: import("../Dependency")[] }} */
							(module).dependencies;
						if (!deps) continue;
						for (const dep of deps) {
							if (
								!(dep instanceof CssUrlDependency) &&
								!(dep instanceof HtmlSourceDependency)
							) {
								continue;
							}
							if (dep.prefetch) hasPrefetch = true;
							if (dep.preload) hasPreload = true;
							if (hasPrefetch && hasPreload) break;
						}
						if (hasPrefetch && hasPreload) break;
					}
					// Attach the startup-hint runtime module to *this* chunk
					// (covering async chunks too) — `runtimeRequirementInTree`
					// alone would only attach it to the runtime chunk, so a
					// hinted `new URL(...)` in an async chunk would never
					// fire its `<link>` injection. We add it whenever this
					// chunk already pulls in `startupAssetHints` (via JS
					// `URLDependency` template) or whenever CSS / HTML lifts
					// it in here.
					if (
						hasPrefetch ||
						hasPreload ||
						set.has(RuntimeGlobals.startupAssetHints)
					) {
						set.add(RuntimeGlobals.startupAssetHints);
						// CSS-only asset modules aren't in JS `__webpack_modules__`,
						// so the startup-hint runtime falls back to
						// `__webpack_require__.p + "filename"`. Make sure
						// `publicPath` is in this chunk's runtime.
						set.add(RuntimeGlobals.publicPath);
						if (hasPrefetch) set.add(RuntimeGlobals.prefetchAsset);
						if (hasPreload) set.add(RuntimeGlobals.preloadAsset);
						compilation.addRuntimeModule(
							chunk,
							new StartupAssetHintRuntimeModule()
						);
					}
				}
			);
			for (const [rel, runtimeGlobal] of /** @type {const} */ ([
				["prefetch", RuntimeGlobals.prefetchAsset],
				["preload", RuntimeGlobals.preloadAsset]
			])) {
				compilation.hooks.runtimeRequirementInTree
					.for(runtimeGlobal)
					.tap(PLUGIN_NAME, (chunk) => {
						compilation.addRuntimeModule(
							chunk,
							new ResourceHintRuntimeModule(rel)
						);
					});
			}
		});
	}
}

module.exports = ResourceHintPlugin;
