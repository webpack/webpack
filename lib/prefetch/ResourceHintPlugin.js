/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { RawSource } = require("webpack-sources");
const ModuleFilenameHelpers = require("../ModuleFilenameHelpers");
const {
	ASSET_URL_TYPE,
	JAVASCRIPT_TYPE
} = require("../ModuleSourceTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const CssUrlDependency = require("../dependencies/CssUrlDependency");
const HtmlSourceDependency = require("../dependencies/HtmlSourceDependency");
const URLDependency = require("../dependencies/URLDependency");
const WorkerDependency = require("../dependencies/WorkerDependency");
const lazyModule = require("../util/lazyModule");
const memoize = require("../util/memoize");
const {
	PUBLIC_PATH_AUTO,
	PUBLIC_PATH_FULL_HASH
} = require("../util/publicPathPlaceholder");
const { guessAsAttribute } = require("./parseResourceHintOptions");
const parseResourceHintOptions = require("./parseResourceHintOptions");

/** @import Chunk from "../Chunk" */
/** @import ChunkGraph from "../ChunkGraph" */
/** @import CodeGenerationResults from "../CodeGenerationResults" */
/** @import Compilation from "../Compilation" */
/** @import Compiler from "../Compiler" */
/** @import Module, { RuntimeRequirements } from "../Module" */

/**
 * The attributes a `<link>` carries besides its href and `as`.
 * @typedef {object} StartupHintAttributes
 * @property {("low" | "high" | "auto" | undefined)=} fetchPriority
 * @property {string=} type
 * @property {string=} media
 */

/**
 * One asset a chunk hints at startup, merged across every reference to it.
 * @typedef {object} AssetHintEntry
 * @property {Module} assetModule the asset the `<link>` points at
 * @property {Module} originModule the chunk module the reference was written in, which is what a baked href is relative to
 * @property {string} request the original request, for guessing the `as` attribute
 * @property {boolean} preload preload rather than prefetch
 * @property {("low" | "high" | "auto" | undefined)} fetchPriority
 * @property {(string | undefined)} as
 * @property {(string | undefined)} type
 * @property {(string | undefined)} media
 */
/**
 * @import {
 * 	ResourceHintsInitial as ResourceHintsConfig,
 * 	ResourceHintsOptions,
 * 	UrlHintRule
 * } from "../../declarations/WebpackOptions"
 */
/** @import { HtmlResourceHint } from "../dependencies/HtmlEntryDependency" */
/** @import { ResourceHintOptions } from "./parseResourceHintOptions" */

/**
 * @typedef {object} ResolvedResourceHints
 * @property {boolean=} prefetch project-wide default for `webpackPrefetch`
 * @property {boolean=} preload project-wide default for `webpackPreload`
 * @property {("low" | "high" | "auto" | false)=} fetchPriority project-wide default for `webpackFetchPriority`
 * @property {string=} as project-wide default for `webpackAs`
 * @property {string=} type project-wide default for `webpackType`
 * @property {string=} media project-wide default for `webpackMedia`
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
 * @property {"preload" | "prefetch" | "modulepreload" | "preconnect"} rel
 * @property {string} href emitted URL (public path applied)
 * @property {string=} as
 * @property {string=} type
 * @property {string=} media
 * @property {("low" | "high" | "auto")=} fetchPriority
 * @property {(boolean | "anonymous" | "use-credentials")=} crossorigin
 * @property {string[]=} hostChunks names of the entrypoint chunks this hint originates from (Vite's `hostId`) — lets the callback rewrite per referencing chunk
 */

/**
 * Origin of `output.publicPath` when it's an absolute cross-origin URL, for
 * `output.autoPreconnect`. `undefined` for relative / `"auto"` public paths.
 * @param {Compilation} compilation compilation
 * @returns {string | undefined} `scheme://host[:port]` or undefined
 */
const getPublicPathOrigin = (compilation) => {
	const publicPath = compilation.outputOptions.publicPath;
	if (typeof publicPath !== "string") return undefined;
	const match = /^(https?:)?\/\/[^/?#]+/i.exec(publicPath);
	return match ? match[0] : undefined;
};

/**
 * @typedef {object} CompilationResolver
 * @property {ResourceHintsConfig | undefined} hints the effective `output.resourceHints` value (`undefined` when unset)
 * @property {(entryName: string) => HtmlHintedAsset[]} getHtmlHinted URL asset descriptors reachable from an HTML entrypoint's initial chunks — `HtmlEntryDependency` template consumes this list to emit `<link>` tags into the extracted HTML `<head>`
 * @property {(assetModule: Module) => boolean} isHtmlHinted true when `assetModule` appears in *any* HTML entry's hinted list — the JS chunk-startup runtime skips it so the DOM never carries two tags for one URL
 * @property {(entryName: string) => EntrypointHint[]} getEntrypointHints resolved `<link>`-shaped descriptors for the given entry — auto initial-graph hints plus URL asset hints, then filtered / rewritten through the user function (when `output.resourceHints` is a function). Reads via `stats.entrypoints[name].resourceHints`.
 */

// only a build that actually emits a resource hint needs these
const getResourceHintRuntimeModule = lazyModule(() =>
	require("./ResourceHintRuntimeModule")
);
const getStartupAssetHintRuntimeModule = lazyModule(() =>
	require("./StartupAssetHintRuntimeModule")
);
// only reached once a build has an html module, so a js-only build never
// pays for the html generator this drags in
const getHtmlEntryDependency = memoize(() =>
	require("../dependencies/HtmlEntryDependency")
);

const PLUGIN_NAME = "ResourceHintPlugin";

/** @type {WeakMap<Compilation, CompilationResolver>} */
const compilationResolvers = new WeakMap();

// Sane default-exclude for URL hint rules: manifests, PDFs, plain text are
// almost never wanted as `<link rel="preload/prefetch">` targets. Explicit
// magic comments still work — they route through `applyParsedHints`.
const DEFAULT_ASSETS_EXCLUDE_REGEXP = /\.(?:webmanifest|pdf|txt)(?:\?.*)?$/i;

// Initial-graph auto hints target JS chunk output files only.
const JS_CHUNK_FILE_REGEXP = /\.m?jsx?$/i;

/**
 * True for the URL-referenced-asset deps that can carry resource-hint flags.
 * Type guard so callers keep the narrowed union without re-listing the classes.
 * @param {import("../Dependency")} dep dependency
 * @returns {dep is URLDependency | CssUrlDependency | HtmlSourceDependency} whether it is a URL asset dep
 */
const isUrlAssetDep = (dep) =>
	dep instanceof URLDependency ||
	dep instanceof CssUrlDependency ||
	dep instanceof HtmlSourceDependency;

/**
 * Entry chunk name for a hint's `hostChunks` (Vite's `hostId`); the id is a
 * stable fallback for unnamed chunks.
 * @param {import("../Chunk")} chunk chunk
 * @returns {string} name or stringified id
 */
const chunkHostName = (chunk) => chunk.name || String(chunk.id);

/**
 * Walk `chunks` × their modules × dependencies and yield each distinct
 * URL-asset module carrying a prefetch/preload flag, deduping targets within a
 * single call. One shared walk for the entrypoint-hint and HTML-hint passes,
 * which would otherwise each re-implement the same 4-level nesting.
 * @param {Compilation} compilation compilation
 * @param {Iterable<import("../Chunk")>} chunks chunks to scan
 * @returns {IterableIterator<{ dep: URLDependency | CssUrlDependency | HtmlSourceDependency, target: Module, chunk: import("../Chunk") }>} hinted assets
 */
function* iterateHintedUrlAssets(compilation, chunks) {
	const { chunkGraph, moduleGraph } = compilation;
	/** @type {WeakSet<Module>} */
	const seen = new WeakSet();
	for (const chunk of chunks) {
		for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
			const deps = module.dependencies;
			if (!deps) continue;
			for (const dep of deps) {
				if (!isUrlAssetDep(dep)) continue;
				if (!dep.prefetch && !dep.preload) continue;
				const target = moduleGraph.getModule(dep);
				if (!target || seen.has(target)) continue;
				seen.add(target);
				yield { dep, target, chunk };
			}
		}
	}
}

/**
 * Merge the matching `UrlHintRule`s for a request. Rules match by
 * `test`/`include`/`exclude` (omit all three → matches everything); later
 * matches override earlier ones for defined fields.
 * @param {UrlHintRule[] | undefined} rules parser-scoped `urlHints`
 * @param {string} request request URL
 * @returns {ResolvedResourceHints} merged defaults
 */
const matchUrlHints = (rules, request) => {
	if (!rules || rules.length === 0) return {};
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
		if (rule.as !== undefined) merged.as = rule.as;
		if (rule.type !== undefined) merged.type = rule.type;
		if (rule.media !== undefined) merged.media = rule.media;
	}
	return merged;
};

/**
 * When `output.resourceHints` is a function, invoke it and return its
 * descriptors; otherwise pass through. Callback signature — see `ResourceHints`
 * schema entry.
 * @param {import("../Entrypoint")} entrypoint entrypoint
 * @param {ResourceHintsConfig | undefined} hints top-level config
 * @param {string} entryName entry name
 * @param {"html" | "js"} hostType page type
 * @param {Compilation} compilation compilation
 * @param {EntrypointHint[]} defaultHints computed default descriptors
 * @returns {EntrypointHint[]} descriptors after the user hook (or the defaults untouched)
 */
const applyUserHook = (
	entrypoint,
	hints,
	entryName,
	hostType,
	compilation,
	defaultHints
) => {
	if (typeof hints !== "function") return defaultHints;
	const out = hints({
		entryName,
		entrypoint,
		hostType,
		compilation,
		// `collectEntrypointHints` always sets `hostChunks`; the callback type
		// declares it required, so assert it here.
		defaultHints:
			/** @type {(HtmlResourceHint & { hostChunks: string[] })[]} */ (
				defaultHints
			)
	});
	return Array.isArray(out) ? /** @type {EntrypointHint[]} */ (out) : [];
};

/**
 * Collect the resolved `<link>`-shaped hint descriptors for an entrypoint —
 * combining the auto initial-graph hints (from a truthy `output.resourceHints`)
 * with the URL-referenced-asset hints (fonts, images, workers) carried on
 * `URLDependency` / `CssUrlDependency` / `HtmlSourceDependency`. Backs
 * `stats.entrypoints[name].resourceHints`. Works for any entrypoint, HTML or
 * JS-only — SSR frameworks read this to inject `<link>` server-side without a
 * separate manifest.
 * @param {import("../Compilation")} compilation compilation
 * @param {string} entryName entrypoint name
 * @param {ResourceHintsConfig | undefined} hints `output.resourceHints`
 * @returns {EntrypointHint[]} descriptors
 */
const collectEntrypointHints = (compilation, entryName, hints) => {
	// `"none"` is a hard off switch — no hints anywhere (stats / manifest / DOM).
	if (hints === "none") return [];
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
	// `resourceHints.preconnect`: warm the connection to a cross-origin
	// publicPath (the origin every chunk / asset is fetched from), emitted first.
	const outputResourceHints = compilation.outputOptions.resourceHints;
	if (outputResourceHints && outputResourceHints.preconnect) {
		const origin = getPublicPathOrigin(compilation);
		if (origin) {
			/** @type {EntrypointHint} */
			const h = { rel: "preconnect", href: origin };
			const crossOrigin = compilation.outputOptions.crossOriginLoading;
			if (crossOrigin) h.crossorigin = crossOrigin;
			push(h);
		}
	}
	// Auto initial-graph hints — computed for `true`, `"prefetch"`, or a
	// function (the callback receives them as `defaultHints`). The array
	// form supplies its own list; nothing is auto-emitted here for it.
	if (hints === true || hints === "prefetch" || typeof hints === "function") {
		const isModuleOutput = compilation.outputOptions.module === true;
		const prefetch = hints === "prefetch";
		const rel = prefetch
			? "prefetch"
			: isModuleOutput
				? "modulepreload"
				: "preload";
		const entryChunk = entrypoint.getEntrypointChunk();
		for (const chunk of entrypoint.chunks) {
			if (chunk === entryChunk) continue;
			for (const file of chunk.files) {
				if (!JS_CHUNK_FILE_REGEXP.test(file)) continue;
				const href = publicPath + file;
				/** @type {EntrypointHint} */
				const h = {
					rel,
					href,
					hostChunks: [chunkHostName(chunk)]
				};
				if (rel === "preload") h.as = "script";
				push(h);
			}
		}
	}
	// URL-referenced deps carrying prefetch/preload. Walk entrypoint's initial
	// chunks × modules × deps (async chunks are handled by the on-demand
	// runtime via `dynamicImportPrefetch/Preload` parser options).
	/** @type {Set<import("../Chunk")>} */
	const chunkSet = new Set(entrypoint.chunks);
	const runtimeChunk = entrypoint.getRuntimeChunk();
	if (runtimeChunk) chunkSet.add(runtimeChunk);
	for (const { dep, target, chunk } of iterateHintedUrlAssets(
		compilation,
		chunkSet
	)) {
		const buildInfo =
			/** @type {{ filename?: string }} */
			(target.buildInfo);
		if (!buildInfo || !buildInfo.filename) continue;
		const asAttribute = dep.asAttribute || guessAsAttribute(dep.request);
		/** @type {EntrypointHint} */
		const h = {
			rel: dep.preload ? "preload" : "prefetch",
			href: publicPath + buildInfo.filename,
			hostChunks: [chunkHostName(chunk)]
		};
		if (asAttribute) h.as = asAttribute;
		if (dep.typeAttribute) h.type = dep.typeAttribute;
		if (dep.mediaAttribute) h.media = dep.mediaAttribute;
		if (dep.fetchPriority) h.fetchPriority = dep.fetchPriority;
		push(h);
	}
	// `hostType`: `"html"` iff the entrypoint has an extracted HTML page
	// (any `HtmlEntryDependency` with elementKind `script`/`script-module` on
	// any HTML module points at this entryName); SSR frameworks reading
	// `stats.entrypoints[name].resourceHints` see `"js"`.
	let hostType = /** @type {"html" | "js"} */ ("js");

	outer: for (const module of compilation.modules) {
		if (!module.getSourceTypes || !module.getSourceTypes().has("html")) {
			continue;
		}
		const presDeps = module.presentationalDependencies;
		if (!presDeps) continue;
		const HtmlEntryDependency = getHtmlEntryDependency();
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
	return applyUserHook(
		entrypoint,
		hints,
		entryName,
		hostType,
		compilation,
		out
	);
};

/**
 * Renders the `<link>` calls a chunk fires at startup, for every asset and worker
 * chunk it references with a resource hint. Run while runtime requirements are still
 * open, so what an href reads is added to `set` rather than assumed: an href spelled
 * as a literal leaves `.p` and `.u` out of the chunk entirely.
 * @param {Chunk} chunk the chunk the calls are emitted into
 * @param {Compilation} compilation the compilation
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {CodeGenerationResults} codeGenerationResults the code generation results
 * @param {RuntimeRequirements} set the chunk's runtime requirements
 * @returns {string[]} one call per hinted asset, in emission order
 */
const collectStartupAssetHintLines = (
	chunk,
	compilation,
	chunkGraph,
	codeGenerationResults,
	set
) => {
	const { moduleGraph, runtimeTemplate } = compilation;
	const resolver =
		/** @type {CompilationResolver} */
		(compilationResolvers.get(compilation));
	/** @type {string[]} */
	const lines = [];

	/**
	 * @param {string} fn the `<link>` helper
	 * @param {string} href the href expression
	 * @param {string} as the `as` attribute
	 * @param {StartupHintAttributes} attributes the remaining attributes
	 * @returns {void}
	 */
	const push = (fn, href, as, attributes) => {
		set.add(fn);
		lines.push(
			`${fn}(${href}, ${JSON.stringify(as)}, ${
				attributes.type ? JSON.stringify(attributes.type) : "undefined"
			}, ${attributes.media ? JSON.stringify(attributes.media) : "undefined"}, ${
				attributes.fetchPriority
					? JSON.stringify(attributes.fetchPriority)
					: "undefined"
			});`
		);
	};

	// The analyzable worker form can't wrap its own href without losing the literal
	// specifier, so its `<link>` fires here — keyed by chunk, hence a separate pass.
	/** @type {Set<string | number>} */
	const seenWorkerChunks = new Set();
	for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
		for (const block of module.blocks) {
			for (const dep of block.dependencies) {
				if (!(dep instanceof WorkerDependency)) continue;
				const hint = dep.options.resourceHint;
				if (!hint || (!hint.preload && !hint.prefetch)) continue;
				const group = chunkGraph.getBlockChunkGroup(block);
				if (!group) continue;
				const workerChunk =
					/** @type {import("../Entrypoint")} */
					(group).getEntrypointChunk();
				if (workerChunk.id === null || seenWorkerChunks.has(workerChunk.id)) {
					continue;
				}
				seenWorkerChunks.add(workerChunk.id);
				// The same specifier the `new Worker(...)` call site bakes, asked of the
				// same module, so the two agree on whether a literal is spellable.
				const specifier = runtimeTemplate.getAnalyzableWorkerUrl(
					dep.options.publicPath,
					workerChunk,
					module,
					chunkGraph,
					set
				);
				// Without one the call site keeps the runtime form, where it wraps its own
				// href — firing the `<link>` here too would emit the call twice.
				if (specifier === null) continue;
				push(
					hint.preload
						? RuntimeGlobals.preloadAsset
						: RuntimeGlobals.prefetchAsset,
					`${runtimeTemplate.importMetaUrl(specifier)}.href`,
					hint.as || "script",
					hint
				);
			}
		}
	}

	// Dedupe per asset module so two references can't emit two `<link>`s: `preload`
	// wins over `prefetch`, and the last explicit attribute override sticks.
	/** @type {Map<string, AssetHintEntry>} */
	const perAsset = new Map();
	for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
		const deps =
			/** @type {{ dependencies?: import("../Dependency")[] }} */
			(module).dependencies;
		if (!deps) continue;
		for (const dep of deps) {
			if (!isUrlAssetDep(dep)) continue;
			if (!dep.prefetch && !dep.preload) continue;
			const assetModule = moduleGraph.getModule(dep);
			if (!assetModule) continue;
			// Already a `<link>` in the html `<head>` emitted by `HtmlEntryDependency`,
			// so the runtime hint would leave the DOM with two tags for one url.
			if (resolver.isHtmlHinted(assetModule)) continue;
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
					originModule: module,
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

	for (const entry of perAsset.values()) {
		const { assetModule } = entry;
		let href;
		// An asset with a javascript wrapper exposes its url through it; one without has
		// no `__webpack_modules__` entry to require.
		if (assetModule.getSourceTypes().has(JAVASCRIPT_TYPE)) {
			href = runtimeTemplate.moduleRaw({
				chunkGraph,
				module: assetModule,
				request: entry.request,
				runtimeRequirements: set,
				weak: false
			});
		} else {
			const has = codeGenerationResults.has(assetModule, chunk.runtime);
			const urlData = has
				? codeGenerationResults.getData(assetModule, chunk.runtime, "url")
				: undefined;
			const resolved = urlData && urlData[ASSET_URL_TYPE];
			// A generator `publicPath` overrides `output.publicPath`, so prefer it; only the
			// two placeholders below are still unresolved when this runs.
			const templated =
				typeof resolved === "string" &&
				(resolved.includes(PUBLIC_PATH_AUTO) ||
					resolved.includes(PUBLIC_PATH_FULL_HASH));
			if (typeof resolved === "string" && !templated) {
				href = JSON.stringify(resolved);
			} else {
				const filename = has
					? codeGenerationResults.getData(
							assetModule,
							chunk.runtime,
							"filename"
						)
					: undefined;
				if (typeof filename !== "string") continue;
				// The literal the `new URL()` call site bakes, asked of the same module —
				// but written into a runtime module, which no `eval` devtool wraps.
				const specifier = runtimeTemplate.supportsAnalyzable(
					"url-runtime",
					chunkGraph,
					entry.originModule
				)
					? runtimeTemplate.getAnalyzableAssetUrl(
							entry.originModule,
							chunkGraph,
							filename,
							chunk.runtime
						)
					: null;
				if (specifier !== null) {
					href = `${runtimeTemplate.importMetaUrl(specifier)}.href`;
				} else {
					set.add(RuntimeGlobals.publicPath);
					href = `${RuntimeGlobals.publicPath} + ${JSON.stringify(filename)}`;
				}
			}
		}
		push(
			entry.preload
				? RuntimeGlobals.preloadAsset
				: RuntimeGlobals.prefetchAsset,
			href,
			entry.as || guessAsAttribute(entry.request),
			entry
		);
	}
	return lines;
};

/**
 * Adds runtime support for `__webpack_require__.PA` / `__webpack_require__.LA`,
 * the helpers that inject `<link rel="prefetch">` / `<link rel="preload">`
 * tags for asset modules referenced via `new URL(..., import.meta.url)`, CSS
 * `url(...)`, and HTML `<img src>` / `<link href>`. Also stores the top-level
 * `output.resourceHints` value so `HtmlEntryDependency` can emit its `<link>`
 * tags into the extracted HTML `<head>`.
 */
class ResourceHintPlugin {
	/**
	 * @param {ResourceHintsOptions=} options normalized `output.resourceHints`
	 */
	constructor(options) {
		/** @type {ResourceHintsConfig | undefined} */
		this._hints = options ? options.initial : undefined;
	}

	/**
	 * Returns the per-compilation resolver. `.hints` is the effective
	 * `output.resourceHints` value (used by `HtmlEntryDependency` template);
	 * `.isHtmlHinted(assetModule)` skips the JS chunk-startup `<link>` when the
	 * HTML `<head>` already emits it.
	 * @param {Compilation} compilation compilation
	 * @returns {CompilationResolver} resolver
	 */
	static getCompilationResolver(compilation) {
		const entry = compilationResolvers.get(compilation);
		if (entry) return entry;
		return {
			hints: undefined,
			getHtmlHinted: () => [],
			isHtmlHinted: () => false,
			getEntrypointHints: () => []
		};
	}

	/**
	 * Match `parser.<type>.urlHints` rules for a request. Returns the merged
	 * defaults; the caller passes them to `applyDefaults`. Exposed so parsers
	 * that own their own URL dep creation (JS/CSS/HTML) can share one matcher.
	 * @param {UrlHintRule[] | undefined} rules rules array
	 * @param {string} request request URL
	 * @returns {ResolvedResourceHints} matched defaults
	 */
	static matchUrlHints(rules, request) {
		return matchUrlHints(rules, request);
	}

	/**
	 * Apply `urlHints` rule defaults to a URL asset dep. Used from URL-emitting
	 * parsers when they have per-request defaults but no comment options to
	 * parse (e.g. the HTML parser's `pendingHints` flow, where the comment was
	 * parsed earlier).
	 * @param {ResourceHintDep} dep dep to mutate
	 * @param {ResolvedResourceHints} defaults `matchUrlHints(rules, request)` result
	 * @returns {void}
	 */
	static applyDefaults(dep, defaults) {
		if (defaults.prefetch) dep.prefetch = true;
		if (defaults.preload) dep.preload = true;
		if (defaults.fetchPriority) dep.fetchPriority = defaults.fetchPriority;
		if (defaults.as !== undefined) dep.asAttribute = defaults.as;
		if (defaults.type !== undefined) dep.typeAttribute = defaults.type;
		if (defaults.media !== undefined) dep.mediaAttribute = defaults.media;
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
	 * Match `urlHints` for `request` + apply per-URL magic-comment overrides
	 * to a URL asset dep. Called from every URL-emitting parser (JS
	 * `new URL(...)`, CSS `url(...)`, HTML `<img src>` / `<link href>`,
	 * `new Worker(new URL(...))`) so all sources share the same precedence:
	 * rule defaults first, magic comments win.
	 * @param {ResourceHintDep} dep dep to mutate in place
	 * @param {UrlHintRule[] | undefined} rules parser-scoped `urlHints` rules
	 * @param {string} request the asset request (for rule matching)
	 * @param {Record<string, EXPECTED_ANY> | null | undefined} commentOptions parsed magic-comment options (`null` / `undefined` skips override phase)
	 * @param {import("../NormalModule")} module module for emitting warnings on invalid comments
	 * @param {import("../Dependency").DependencyLocation} loc loc for warnings
	 * @returns {void}
	 */
	static applyResourceHints(dep, rules, request, commentOptions, module, loc) {
		ResourceHintPlugin.applyDefaults(dep, matchUrlHints(rules, request));
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
		const hints = this._hints;

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
					const HtmlEntryDependency = getHtmlEntryDependency();
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
						const runtimeChunk = entrypoint.getRuntimeChunk();
						if (runtimeChunk) chunks.add(runtimeChunk);
						/** @type {HtmlHintedAsset[]} */
						const hinted = [];
						for (const { dep: assetDep, target } of iterateHintedUrlAssets(
							compilation,
							chunks
						)) {
							anyHtmlHinted.add(target);
							hinted.push({ module: target, dep: assetDep });
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
				hints,
				getHtmlHinted: (entryName) => {
					if (hints === "none") return [];
					if (!perEntry) build();
					return (
						/** @type {Map<string, HtmlHintedAsset[]>} */ (perEntry).get(
							entryName
						) || []
					);
				},
				isHtmlHinted: (assetModule) => {
					if (hints === "none") return false;
					if (!anyHtmlHinted) build();
					return /** @type {WeakSet<Module>} */ (anyHtmlHinted).has(
						assetModule
					);
				},
				getEntrypointHints: (entryName) =>
					collectEntrypointHints(compilation, entryName, hints)
			});
			// Rendered here, not in the runtime module: requirements are still open, so a
			// literal href costs no `.p`/`.u`, and async chunks are reached as well.
			compilation.hooks.additionalChunkRuntimeRequirements.tap(
				PLUGIN_NAME,
				(chunk, set, { chunkGraph, codeGenerationResults }) => {
					// Browser markup, and no DOM to put it in — the call sites skip their
					// hints under build-time execution too (`URLDependency`).
					if (hints === "none" || chunkGraph.buildTimeExecution) return;
					const lines = collectStartupAssetHintLines(
						chunk,
						compilation,
						chunkGraph,
						codeGenerationResults,
						set
					);
					if (lines.length === 0) return;
					set.add(RuntimeGlobals.startupAssetHints);
					compilation.addLazyRuntimeModule(
						chunk,
						getStartupAssetHintRuntimeModule,
						(Ctor) => new Ctor(lines)
					);
				}
			);
			for (const [rel, runtimeGlobal] of /** @type {const} */ ([
				["prefetch", RuntimeGlobals.prefetchAsset],
				["preload", RuntimeGlobals.preloadAsset]
			])) {
				compilation.hooks.runtimeRequirementInTree
					.for(runtimeGlobal)
					.tap(PLUGIN_NAME, (chunk) => {
						compilation.addLazyRuntimeModule(
							chunk,
							getResourceHintRuntimeModule,
							(Ctor) => new Ctor(rel)
						);
					});
			}

			// SSR manifest: serialize each entrypoint's resolved hints to a JSON
			// asset (the same descriptors as `stats.entrypoints[].resourceHints`)
			// so an SSR server can inject the `<link>` tags itself. `"none"`
			// yields empty lists (via `collectEntrypointHints`).
			const rhOptions = compilation.outputOptions.resourceHints;
			const manifestPath = rhOptions && rhOptions.manifest;
			if (manifestPath) {
				const Compilation = require("../Compilation");

				compilation.hooks.processAssets.tap(
					{
						name: PLUGIN_NAME,
						stage: Compilation.PROCESS_ASSETS_STAGE_REPORT
					},
					() => {
						/** @type {Record<string, EntrypointHint[]>} */
						const manifest = {};
						for (const name of compilation.entrypoints.keys()) {
							manifest[name] = collectEntrypointHints(compilation, name, hints);
						}
						const source = new RawSource(
							`${JSON.stringify(manifest, null, 2)}\n`
						);
						if (compilation.getAsset(manifestPath)) {
							compilation.updateAsset(manifestPath, source);
						} else {
							compilation.emitAsset(manifestPath, source);
						}
					}
				);
			}
		});
	}
}

module.exports = ResourceHintPlugin;
