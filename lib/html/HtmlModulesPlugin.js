/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { pathToFileURL } = require("url");
const { AsyncSeriesHook, AsyncSeriesWaterfallHook } = require("tapable");
const { RawSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const EntryOptionPlugin = require("../EntryOptionPlugin");
const EntryPlugin = require("../EntryPlugin");
const HotUpdateChunk = require("../HotUpdateChunk");
const { HTML_TYPE } = require("../ModuleSourceTypeConstants");
const { HTML_MODULE_TYPE } = require("../ModuleTypeConstants");
const NormalModule = require("../NormalModule");
const ConstDependency = require("../dependencies/ConstDependency");
const HtmlEntryDependency = require("../dependencies/HtmlEntryDependency");
const HtmlInlineHtmlDependency = require("../dependencies/HtmlInlineHtmlDependency");
const HtmlInlineScriptDependency = require("../dependencies/HtmlInlineScriptDependency");
const HtmlInlineStyleDependency = require("../dependencies/HtmlInlineStyleDependency");
const HtmlSourceDependency = require("../dependencies/HtmlSourceDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const WebpackError = require("../errors/WebpackError");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");
const { compareModulesByFullName } = require("../util/comparators");
const createHash = require("../util/createHash");
const createHooksRegistry = require("../util/createHooksRegistry");
const { getUndoPath, makePathsRelative } = require("../util/identifier");
const implicitTypeLoaderFallback = require("../util/implicitTypeLoaderFallback");
const memoize = require("../util/memoize");
const { digestNonNumericOnly } = require("../util/nonNumericOnlyHash");
const {
	PUBLIC_PATH_AUTO: autoPlaceholder
} = require("../util/publicPathPlaceholder");
const removeBOM = require("../util/removeBOM");
const HtmlGenerator = require("./HtmlGenerator");
const HtmlModule = require("./HtmlModule");
const HtmlParser = require("./HtmlParser");
const { escapeAttribute } = require("./syntax");

/** @typedef {import("../../declarations/WebpackOptions").EntryDescriptionNormalized} EntryDescriptionNormalized */
/** @typedef {import("../../declarations/WebpackOptions").OutputHtmlOptions["favicon"]} FaviconOption */
/** @typedef {import("../../declarations/WebpackOptions").OutputHtmlOptions["manifest"]} ManifestOption */
/** @typedef {import("../../declarations/WebpackOptions").HtmlFaviconIcon} HtmlFaviconIcon */
/** @typedef {Exclude<HtmlFaviconIcon, string>} FaviconIcon */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("./HtmlModule").HtmlModuleBuildInfo} HtmlModuleBuildInfo */
/** @typedef {{ request: string, entryName: string, type: "script" | "script-module" | "modulepreload" | "stylesheet" | "html" | "preload" | "prefetch", css?: boolean }} HtmlEntryInfo */

/** @typedef {{ outputName: string }} HtmlTransformHtmlContext */
/** @typedef {{ outputName: string }} HtmlEmittedContext */
/**
 * A tag to inject into an emitted page as a structured descriptor. Injected
 * verbatim (not re-bundled) at the `injectTo` position.
 * @typedef {object} HtmlTagDescriptor
 * @property {string} tag tag name, e.g. `"script"` / `"link"` / `"meta"`
 * @property {Record<string, string | boolean | undefined>=} attrs attributes; `true` renders a bare boolean attribute, `false`/`undefined` is omitted
 * @property {string=} children inner content (ignored for void elements like `<link>`/`<meta>`)
 * @property {("head" | "body" | "head-prepend" | "body-prepend")=} injectTo placement; defaults to `"head"`
 * @property {boolean=} voidTag force a void element (no closing tag); inferred from the tag name when omitted
 */
/** @typedef {{ outputName: string, html: string }} HtmlInjectTagsContext */
/**
 * A `<script>`/`<link>`/`<style>`/`<meta>` tag already present in an emitted
 * page, exposed for in-place mutation by `transformTags`. Mutate `attrs`, set
 * `remove`, or change `injectTo` to move it; don't reorder the array itself.
 * @typedef {object} HtmlMutableTag
 * @property {string} tag the (lowercased) tag name
 * @property {Record<string, string | boolean | undefined>} attrs mutable attributes; a string value renders `name="value"`, `true` a bare attribute, `false`/`undefined`/deleting the key drops it
 * @property {("head" | "body" | "head-prepend" | "body-prepend")=} injectTo the tag's current region (`"head"`/`"body"`); set a different value to move it there (`*-prepend` to the region's start)
 * @property {boolean=} remove set true to delete the whole element
 */
/** @typedef {{ outputName: string, html: string }} HtmlTransformTagsContext */
/**
 * @typedef {object} HtmlCompilationHooks
 * @property {AsyncSeriesWaterfallHook<[HtmlTagDescriptor[], HtmlInjectTagsContext]>} injectTags called with the list of extra tags to inject into each page (initially empty) plus the current HTML; push `HtmlTagDescriptor`s and return the list — webpack serializes and places them by `injectTo`. A structured alternative to the string-level `transformHtml` for adding tags; runs before CSP so injected inline tags are hashed
 * @property {AsyncSeriesHook<[HtmlMutableTag[], HtmlTransformTagsContext]>} transformTags called with the page's `<script>`/`<link>`/`<style>`/`<meta>` tags (webpack's own and any injected) as mutable descriptors; mutate `attrs` (add a `nonce`/`data-*`, switch `defer`↔`async`, …), set `remove: true`, or change `injectTo` to move a tag between `<head>` and `<body>`, and webpack rewrites the changed tags. Add new tags with `injectTags` instead
 * @property {AsyncSeriesWaterfallHook<[string, HtmlTransformHtmlContext]>} transformHtml called with each emitted page's final HTML (all sentinels resolved) just before it is written; return the (possibly transformed) HTML — e.g. to minify, inject a CSP meta, or rewrite tags
 * @property {AsyncSeriesHook<[HtmlEmittedContext]>} htmlEmitted called once each page's HTML asset has been finalized — a post-emit notification (nothing to return)
 */

const PLUGIN_NAME = "HtmlModulesPlugin";

// Built-in default favicon (the webpack logo). Referenced as a `file:` request
// so `<link rel="icon">` in the synthetic wrapper flows through the normal
// asset pipeline — emitted hashed, with the correct publicPath, no direct IO.
// Resolved from `__filename` (a sibling of this module) — no `path` needed.
const DEFAULT_FAVICON = new URL("./favicon.svg", pathToFileURL(__filename))
	.href;

// mime-db is heavy — only load it when a favicon actually needs a `type`.
const getMimeTypes = memoize(() => require("../util/mimeTypes"));

/**
 * Resolves `output.html.favicon` for one page to `[rel, icon]` pairs.
 * `false`/absent → none; `true` → the webpack logo; a string → one `icon`
 * link; an object maps each `rel` to an icon (a path string, an attributes
 * object, or an array of those for several icons under one `rel`); a function
 * receives the page name and returns any of those. Each icon is normalized to
 * an object so `faviconLinkTag` reads one shape.
 * @param {FaviconOption} favicon favicon option
 * @param {string} name page/entry name
 * @returns {[string, FaviconIcon][]} rel/icon pairs, in order
 */
const resolveFaviconLinks = (favicon, name) => {
	const value = typeof favicon === "function" ? favicon(name) : favicon;
	if (value === true) return [["icon", { href: DEFAULT_FAVICON }]];
	if (typeof value === "string") return [["icon", { href: value }]];
	if (value && typeof value === "object") {
		/** @type {[string, FaviconIcon][]} */
		const pairs = [];
		for (const [rel, icon] of Object.entries(value)) {
			for (const one of Array.isArray(icon) ? icon : [icon]) {
				pairs.push([rel, typeof one === "string" ? { href: one } : one]);
			}
		}
		return pairs;
	}
	return [];
};

/**
 * @param {string} rel link relation
 * @param {FaviconIcon} icon icon `href` plus optional link attributes
 * @returns {string} a `<link rel=… [attrs…] href=…>` tag; `type` defaults to the file format
 */
const faviconLinkTag = (rel, icon) => {
	const type = icon.type || getMimeTypes().lookup(icon.href) || "";
	const attrs = [
		`rel="${escapeAttribute(rel)}"`,
		icon.sizes && `sizes="${escapeAttribute(icon.sizes)}"`,
		type && `type="${escapeAttribute(type)}"`,
		icon.media && `media="${escapeAttribute(icon.media)}"`,
		icon.color && `color="${escapeAttribute(icon.color)}"`,
		icon.crossorigin && `crossorigin="${escapeAttribute(icon.crossorigin)}"`,
		`href="${escapeAttribute(icon.href)}"`
	];
	return `<link ${attrs.filter(Boolean).join(" ")}>`;
};

/**
 * Resolves `output.html.manifest` for one page to a `<link rel="manifest">`
 * tag, or `""` when unset. A string is a path to an existing `.webmanifest`
 * file; an object is serialized to a base64 `data:application/manifest+json`
 * URL (routed to `asset/webmanifest` by a default rule, so its relative icon
 * `src`s are hashed like any request); a function receives the page name.
 * Base64 (not percent-encoding) is required because this tag is embedded in
 * the outer `data:text/html` wrapper, which is itself percent-decoded — a
 * percent-encoded inner URL would be corrupted by that decode.
 * @param {ManifestOption} manifest manifest option
 * @param {string} name page/entry name
 * @returns {string} the `<link>` tag, or ""
 */
const manifestLinkTag = (manifest, name) => {
	const value = typeof manifest === "function" ? manifest(name) : manifest;
	if (!value) return "";
	const href =
		typeof value === "string"
			? value
			: `data:application/manifest+json;base64,${Buffer.from(
					JSON.stringify(value),
					"utf8"
				).toString("base64")}`;
	return `<link rel="manifest" href="${escapeAttribute(href)}">`;
};

// `\.html`/`\.css` request matchers for the synthetic `output.html` wrapper.
const HTML_REQUEST_RE = /\.html(\?|$)/i;
const CSS_REQUEST_RE = /\.css(\?|$)/i;

/**
 * Requests an `output.html` page must load for an entry: its `dependOn`
 * ancestors first (transitive, deduped — so a diamond loads each once), then
 * the entry's own imports. `.html` imports are dropped (own HTML entries).
 * @param {string} name entry name
 * @param {Record<string, EntryDescriptionNormalized>} entries normalized static entries
 * @returns {string[]} deduped requests in load order
 */
const collectHtmlEntryRequests = (name, entries) => {
	/** @type {string[]} */
	const requests = [];
	/** @type {Set<string>} */
	const seenRequests = new Set();
	/** @type {Set<string>} */
	const visited = new Set();
	const walk = (/** @type {string} */ entryName) => {
		if (visited.has(entryName)) return;
		visited.add(entryName);
		const desc = entries[entryName];
		if (!desc) return;
		if (desc.dependOn) {
			for (const dep of desc.dependOn) walk(dep);
		}
		if (!desc.import) return;
		for (const request of desc.import) {
			if (HTML_REQUEST_RE.test(request) || seenRequests.has(request)) continue;
			seenRequests.add(request);
			requests.push(request);
		}
	};
	walk(name);
	return requests;
};

/**
 * @param {string} name definition name in `schemas/WebpackOptions.json`
 * @returns {EXPECTED_OBJECT} a schema referencing `#/definitions/<name>`
 */
const getSchema = (name) => {
	const { definitions } = require("../../schemas/WebpackOptions.json");

	return {
		definitions,
		oneOf: [{ $ref: `#/definitions/${name}` }]
	};
};

const generatorValidationOptions = {
	name: "Html Modules Plugin",
	baseDataPath: "generator"
};

const parserValidationOptions = {
	name: "Html Modules Plugin",
	baseDataPath: "parser"
};

class HtmlModulesPlugin {
	/**
	 * `output.hashFunction`/`hashSalt`/`hashDigest`/`hashDigestLength`
	 * digest of `content`, with `nonNumericOnlyHash` applied — webpack's
	 * standard `[contenthash]` recipe.
	 * @param {string | Buffer} content content to hash
	 * @param {import("../../declarations/WebpackOptions").Output} outputOptions output options
	 * @returns {string} content hash
	 */
	static computeContentHash(content, outputOptions) {
		const hash = createHash(
			/** @type {import("../../declarations/WebpackOptions").HashFunction} */
			(outputOptions.hashFunction)
		);
		if (outputOptions.hashSalt) hash.update(outputOptions.hashSalt);
		hash.update(content);
		return digestNonNumericOnly(
			hash,
			/** @type {string} */ (outputOptions.hashDigest),
			/** @type {number} */ (outputOptions.hashDigestLength)
		);
	}

	/**
	 * Filename template for an extracted HTML page: `output.htmlFilename` for
	 * initial chunks, `output.htmlChunkFilename` otherwise — the HTML counterpart
	 * of `CssModulesPlugin.getChunkFilenameTemplate`.
	 * @param {import("../Chunk")} chunk chunk
	 * @param {import("../../declarations/WebpackOptions").Output} outputOptions output options
	 * @returns {import("../Chunk").ChunkFilenameTemplate} used filename template
	 */
	static getChunkFilenameTemplate(chunk, outputOptions) {
		return chunk.canBeInitial()
			? /** @type {import("../Chunk").ChunkFilenameTemplate} */ (
					outputOptions.htmlFilename
				)
			: /** @type {import("../Chunk").ChunkFilenameTemplate} */ (
					outputOptions.htmlChunkFilename
				);
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const { output } = compiler.options;
		const htmlOption = output.html;
		const scriptLoading =
			(typeof htmlOption === "object" && htmlOption.scriptLoading) || "auto";
		// ESM output emits `type="module"` (already deferred), so scriptLoading
		// is ignored under output.module — warn on an explicit defer/blocking.
		let scriptAttr = " defer";
		if (output.module) {
			scriptAttr = "";
			if (scriptLoading === "defer" || scriptLoading === "blocking") {
				compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.warnings.push(
						new WebpackError(
							`output.html.scriptLoading: "${scriptLoading}" is ignored with output.module — ES module scripts are always deferred.`
						)
					);
				});
			}
		} else if (scriptLoading === "blocking") {
			scriptAttr = "";
		}

		// `output.html` (or an entry's `html`) wraps a non-HTML entry in a
		// synthetic HTML module so the existing pipeline injects its JS/CSS
		// chunks and applies the `template` option. `dependOn` ancestors are
		// injected first so the page loads the shared/runtime chunks before
		// the entry's own (see `collectHtmlEntryRequests`). `crossOriginLoading`
		// and SRI are applied to the injected tags centrally in
		// HtmlEntryDependency.
		EntryOptionPlugin.getHooks(compiler).entry.tap(
			PLUGIN_NAME,
			(context, name, desc) => {
				const html = desc.html !== undefined ? desc.html : htmlOption;
				const imports = desc.import;
				if (
					!html ||
					!imports ||
					imports.every((r) => HTML_REQUEST_RE.test(r))
				) {
					return;
				}
				const entries = compiler.options.entry;
				const requests =
					typeof entries === "object" && entries[name]
						? collectHtmlEntryRequests(name, entries)
						: imports.filter((r) => !HTML_REQUEST_RE.test(r));
				const links = [];
				const scripts = [];
				for (const r of requests) {
					if (CSS_REQUEST_RE.test(r)) {
						links.push(`<link rel="stylesheet" href="${r}">`);
					} else {
						scripts.push(`<script${scriptAttr} src="${r}"></script>`);
					}
				}
				const htmlObj =
					typeof html === "object"
						? html
						: typeof htmlOption === "object"
							? htmlOption
							: {};
				const headTags = HtmlParser.buildHeadTags(htmlObj);
				// Injected into webpack-generated pages only; each icon's href is a
				// normal request the parser turns into a hashed asset.
				const favicon =
					typeof html === "object" && html.favicon !== undefined
						? html.favicon
						: false;
				const faviconTag = resolveFaviconLinks(favicon, name)
					.map(([rel, icon]) => faviconLinkTag(rel, icon))
					.join("");
				const manifest =
					typeof html === "object" && html.manifest !== undefined
						? html.manifest
						: false;
				const manifestTag = manifestLinkTag(manifest, name);
				const inject = htmlObj.inject;
				const scriptsInHead =
					inject === "head" || (inject !== "body" && output.module);
				const scriptsFirst = output.module || scriptAttr === " defer";
				const headScripts = scriptsInHead ? scripts.join("") : "";
				return `data:text/html,<!doctype html><html><head>${faviconTag}${manifestTag}${headTags}${
					scriptsFirst
						? headScripts + links.join("")
						: links.join("") + headScripts
				}</head><body>${scriptsInHead ? "" : scripts.join("")}</body></html>`;
			}
		);

		// Per-chunk `RawSource` reused across builds when bytes are unchanged:
		// keeping identity stable avoids invalidating `RealContentHashPlugin|analyse`.
		/** @type {Map<string, { content: string, source: import("webpack-sources").RawSource }>} */
		const sentinelResolvedSourceCache = new Map();

		// `<script src>` and `<link rel="modulepreload">` references collected
		// by HtmlParser become real compilation entries here. The `script`
		// and `script-module` groups are chained via a leader-only dependOn so
		// they share a runtime — the first entry of the group owns it and
		// every subsequent entry sets `dependOn: [leader]`. Modulepreload
		// entries are emitted as independent entries (no dependOn) so they
		// can never be imported as a runtime leader by a later script —
		// that's what keeps the "preload but don't execute" contract of
		// `<link rel="modulepreload">` intact.
		// Per-compilation state: the HTML modules seen during make (so
		// `finishMake` creates their entries without scanning the whole module
		// graph) and the stylesheet entry names (read in `afterChunks`).
		/** @type {WeakMap<import("../Compilation"), { htmlModules: Set<import("../Module")>, stylesheetEntries: Set<string>, htmlAssetNames: Set<string> }>} */
		const compilationState = new WeakMap();
		/**
		 * @param {import("../Compilation")} compilation compilation
		 * @returns {{ htmlModules: Set<import("../Module")>, stylesheetEntries: Set<string>, htmlAssetNames: Set<string> }} per-compilation state
		 */
		const getState = (compilation) => {
			let state = compilationState.get(compilation);
			if (state === undefined) {
				state = {
					htmlModules: new Set(),
					stylesheetEntries: new Set(),
					htmlAssetNames: new Set()
				};
				compilationState.set(compilation, state);
			}
			return state;
		};
		compiler.hooks.finishMake.tapAsync(PLUGIN_NAME, (compilation, callback) => {
			const { htmlModules, stylesheetEntries } = getState(compilation);

			// Collect the entries an HTML module asks for. Only the script chains
			// (`script`, `script-module`) share a runtime via a leader-only
			// `dependOn`; `modulepreload`, `stylesheet` and `html` links are all
			// independent entries (a CSS or page entry must not chain into a JS
			// leader, or the chunk would mix unrelated outputs).
			/** @type {(module: import("../Module")) => { context: string, request: string, name: string, dependOn: string[] | undefined }[]} */
			const collectEntrySpecs = (module) => {
				const { htmlEntries } = /** @type {HtmlModuleBuildInfo} */ (
					module.buildInfo
				);
				if (!htmlEntries) return [];
				const context = /** @type {string} */ (module.context);
				const specs = [];
				for (const [groupKind, group] of Object.entries(htmlEntries)) {
					const isChainGroup =
						groupKind === "script" || groupKind === "script-module";
					/** @type {string | undefined} */
					let leaderName;
					for (const entry of group) {
						const dependOn =
							isChainGroup && leaderName !== undefined
								? [leaderName]
								: undefined;
						if (isChainGroup && leaderName === undefined) {
							leaderName = entry.entryName;
						}
						// Stylesheet entries and `as="style"` preload/prefetch entries emit
						// a CSS chunk, so they need the CSS filename template below.
						if (groupKind === "stylesheet" || entry.css) {
							stylesheetEntries.add(entry.entryName);
						}
						specs.push({
							context,
							request: entry.request,
							name: entry.entryName,
							dependOn
						});
					}
				}
				return specs;
			};

			// Push one collected reference as a compilation entry; resolves with
			// the built entry module.
			/** @type {(spec: { context: string, request: string, name: string, dependOn: string[] | undefined }) => Promise<import("../Module") | null>} */
			const addEntry = (spec) =>
				new Promise((resolve, reject) => {
					compilation.addEntry(
						spec.context,
						EntryPlugin.createDependency(spec.request, { name: spec.name }),
						{
							name: spec.name,
							// Each entry gets its own filename from the synthetic entry name so
							// it doesn't collide with `output.filename`. CSS entries set their
							// `.css` name via `cssFilenameTemplate` below; `html` page entries
							// emit their file via `renderManifest`.
							filename: compilation.outputOptions.chunkFilename || "[name].js",
							dependOn: spec.dependOn
						},
						(err, entryModule) =>
							err ? reject(err) : resolve(entryModule || null)
					);
				});

			// Create one HTML module's entries. A `type: "html"` link is itself an
			// HTML entry, so after it builds we recurse into it — the same handling
			// every HTML entry already gets. `processed` guards diamonds and cycles.
			/** @type {WeakSet<import("../Module")>} */
			const processed = new WeakSet();
			/** @type {(module: import("../Module")) => Promise<void>} */
			const processEntry = async (module) => {
				if (processed.has(module)) return;
				processed.add(module);
				await Promise.all(
					collectEntrySpecs(module).map(async (spec) => {
						const entryModule = await addEntry(spec);
						if (entryModule && entryModule.type === HTML_MODULE_TYPE) {
							await processEntry(entryModule);
						}
					})
				);
			};
			// Seed with the HTML modules seen during make (config entries /
			// imports, fresh or cache-restored); linked pages are reached by
			// recursion above.
			Promise.all([...htmlModules].map(processEntry)).then(
				() => callback(),
				callback
			);
		});

		const integrity =
			typeof htmlOption === "object" ? htmlOption.integrity : undefined;
		const integrityOn =
			integrity === true ||
			typeof integrity === "function" ||
			(Array.isArray(integrity) && integrity.length > 0);
		// `output.html.csp` injects a `<meta http-equiv="Content-Security-Policy">`
		// once the page's inline content is final (in `processAssets` below).
		const csp = typeof htmlOption === "object" ? htmlOption.csp : undefined;
		// `"auto"` marks implicit enablement (no user rule for HTML files) — see
		// `applyExperimentsDefaults`. Only then loaders win over the built-in type
		// (e.g. html-webpack-plugin's template loader in its child compiler).
		// TODO webpack 6: html defaults to `true`, drop this implicit-only fallback.
		const implicitlyEnabled = compiler.options.experiments.html === "auto";
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				if (implicitlyEnabled) {
					implicitTypeLoaderFallback(
						normalModuleFactory,
						PLUGIN_NAME,
						/\.html$/i,
						HTML_MODULE_TYPE
					);
				}
				const { htmlModules } = getState(compilation);
				// Record HTML modules as they appear — freshly built
				// (`succeedModule`) or restored from cache (`stillValidModule`) —
				// so `finishMake` creates their entries without scanning every
				// module in the graph. Tracking only records; entries are still
				// added (and awaited) in `finishMake`.
				const trackHtmlModule = (/** @type {import("../Module")} */ module) => {
					if (module.type === HTML_MODULE_TYPE) htmlModules.add(module);
				};
				compilation.hooks.succeedModule.tap(PLUGIN_NAME, trackHtmlModule);
				compilation.hooks.stillValidModule.tap(PLUGIN_NAME, trackHtmlModule);

				// Resolve integrity and inline sentinels after `RealContentHashPlugin`
				// so final bytes are in place. Only HTML pages carry these sentinels —
				// never JS chunks that embed an HTML string.
				// SRI only takes effect on a cross-origin subresource fetched
				// with CORS; without `output.crossOriginLoading` the browser
				// silently ignores `integrity` on cross-origin loads. Warn once
				// so a CDN deployment doesn't ship no-op integrity attributes.
				if (integrityOn && !compilation.outputOptions.crossOriginLoading) {
					compilation.warnings.push(
						new WebpackError(
							'output.html.integrity is set but output.crossOriginLoading is not. Browsers ignore Subresource Integrity on cross-origin requests made without CORS; set output.crossOriginLoading (e.g. "anonymous") if any asset is served from a different origin.'
						)
					);
				}
				compilation.hooks.processAssets.tapPromise(
					{
						name: PLUGIN_NAME,
						stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_HASH + 1
					},
					async (assets) => {
						const { htmlAssetNames } = getState(compilation);
						const hooks = HtmlModulesPlugin.getCompilationHooks(compilation);
						/** @type {Set<string>} */
						const inlinedFiles = new Set();
						for (const name of Object.keys(assets)) {
							if (!htmlAssetNames.has(name)) continue;
							const content = assets[name].source();
							if (typeof content !== "string") continue;
							let resolved = content;
							if (
								integrityOn &&
								resolved.includes("__WEBPACK_HTML_INTEGRITY__")
							) {
								resolved = HtmlGenerator.resolveChunkIntegritySentinels(
									resolved,
									compilation,
									/** @type {import("./HtmlGenerator").HtmlIntegrity} */ (
										integrity
									)
								);
							}
							if (resolved.includes("__WEBPACK_HTML_INLINE__")) {
								resolved = HtmlGenerator.resolveChunkInlineSentinels(
									resolved,
									compilation,
									name,
									inlinedFiles
								);
							}
							// `injectTags` (add tags), `transformTags` (mutate/move/remove the
							// page's own and injected tags), and CSP all run over a single
							// parse: collect the tags/anchors once, let the hooks act, then
							// render every edit — placement, attribute rewrites, moves,
							// removals, CSP hashes/nonce/meta — in one pass. Injected inline
							// `<script>`/`<style>` are hashed like the page's own.
							const injected = await hooks.injectTags.promise([], {
								outputName: name,
								html: resolved
							});
							const transformTags = hooks.transformTags.taps.length > 0;
							if (injected.length > 0 || transformTags || csp) {
								const model = HtmlGenerator.collectHtml(resolved);
								HtmlGenerator.addInjectedTags(model, injected);
								if (transformTags) {
									await hooks.transformTags.promise(model.tags, {
										outputName: name,
										html: resolved
									});
								}
								resolved = HtmlGenerator.renderHtml(resolved, model, csp);
							}
							// Final, fully-resolved HTML — let plugins transform it (minify,
							// inject a CSP meta, rewrite tags) before it is written.
							resolved = await hooks.transformHtml.promise(resolved, {
								outputName: name
							});
							if (resolved !== content) {
								compilation.updateAsset(name, new RawSource(resolved));
							}
							await hooks.htmlEmitted.promise({ outputName: name });
						}
						// An inlined chunk file is dead weight once nothing else references
						// it by URL (another page's tag, or the runtime's async chunk map);
						// a content-hashed filename makes a substring hit a real reference.
						// Materialize each other asset's source once (it can be expensive to
						// render) and test all inlined files against it, rather than
						// re-materializing every asset per inlined file.
						if (inlinedFiles.size > 0) {
							/** @type {Set<string>} */
							const stillReferenced = new Set();
							for (const name of Object.keys(compilation.assets)) {
								if (
									inlinedFiles.has(name) ||
									stillReferenced.size === inlinedFiles.size
								) {
									continue;
								}
								const source = compilation.assets[name].source();
								if (typeof source !== "string") continue;
								for (const file of inlinedFiles) {
									if (!stillReferenced.has(file) && source.includes(file)) {
										stillReferenced.add(file);
									}
								}
							}
							for (const file of inlinedFiles) {
								if (!stillReferenced.has(file)) compilation.deleteAsset(file);
							}
						}
					}
				);

				// CSS entries created by `<link rel="stylesheet">` in HTML need
				// their `.css` filename set via `chunk.cssFilenameTemplate`
				// (the field `CssModulesPlugin.getChunkFilenameTemplate` reads).
				// Compilation only flows `options.filename` to `chunk.filenameTemplate`,
				// which controls JS emit — there's no entry-level `cssFilename`.
				// Set it ourselves after chunks are created so each stylesheet
				// entry emits to a distinct file derived from `output.cssFilename`
				// (or `output.cssChunkFilename` for non-initial CSS chunks).
				compilation.hooks.afterChunks.tap(PLUGIN_NAME, () => {
					const { stylesheetEntries } = getState(compilation);
					if (stylesheetEntries.size === 0) return;
					for (const entryName of stylesheetEntries) {
						const entrypoint = compilation.entrypoints.get(entryName);
						if (!entrypoint) continue;
						const chunk = entrypoint.getEntrypointChunk();
						if (!chunk) continue;
						// Each html-derived stylesheet entry uses the
						// `cssChunkFilename` template — even though the entry
						// chunk technically `canBeInitial()`, we deliberately
						// avoid `cssFilename` here because that template often
						// has no per-entry placeholder (it's derived from
						// `output.filename`, which can be a literal like
						// `bundle0.js`), and multiple `<link rel="stylesheet">`
						// tags would then collide on the same emitted `.css`
						// file. `cssChunkFilename` is derived from
						// `output.chunkFilename` which webpack auto-extends
						// with `[id].` when needed, guaranteeing uniqueness.
						chunk.cssFilenameTemplate =
							compilation.outputOptions.cssChunkFilename;
					}
				});
				compilation.dependencyFactories.set(
					HtmlSourceDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HtmlSourceDependency,
					new HtmlSourceDependency.Template()
				);
				compilation.dependencyFactories.set(
					HtmlEntryDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HtmlEntryDependency,
					new HtmlEntryDependency.Template()
				);
				// Inline `<script>` content is bundled as its own entry — the
				// same pipeline that handles `<script src>` — via a
				// `data:text/javascript,...` request. The dependency
				// template rewrites the original tag to `<script src=…>`.
				compilation.dependencyFactories.set(
					HtmlInlineScriptDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HtmlInlineScriptDependency,
					new HtmlInlineScriptDependency.Template()
				);
				// Inline `<style>` content is routed through the CSS pipeline
				// as a `data:text/css` module. The dependency template reads
				// the processed CSS text from the CSS module's code
				// generation data (`css-text` channel set by CssGenerator
				// when `exportType` is `"text"`).
				compilation.dependencyFactories.set(
					HtmlInlineStyleDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HtmlInlineStyleDependency,
					new HtmlInlineStyleDependency.Template()
				);
				// `<iframe srcdoc>` content is routed back through the HTML
				// pipeline as a `data:text/html` module; the template reads the
				// processed HTML from the nested module's `html` channel.
				compilation.dependencyFactories.set(
					HtmlInlineHtmlDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HtmlInlineHtmlDependency,
					new HtmlInlineHtmlDependency.Template()
				);
				compilation.dependencyTemplates.set(
					StaticExportsDependency,
					new StaticExportsDependency.Template()
				);
				// `ConstDependency` is used by HtmlParser to insert
				// ` type="module"` into the rewritten <script> tag when
				// `output.module` is on. Register its template so the HTML
				// generator runs the insertion.
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);
				normalModuleFactory.hooks.createModuleClass
					.for(HTML_MODULE_TYPE)
					.tap(
						PLUGIN_NAME,
						(createData, _resolveData) => new HtmlModule(createData)
					);
				normalModuleFactory.hooks.createParser
					.for(HTML_MODULE_TYPE)
					.tap(PLUGIN_NAME, (parserOptions) => {
						compiler.validate(
							() => getSchema("HtmlParserOptions"),
							parserOptions,
							parserValidationOptions,
							(options) =>
								require("../../schemas/plugins/HtmlParserOptions.check")(
									options
								)
						);
						return new HtmlParser(parserOptions);
					});

				normalModuleFactory.hooks.createGenerator
					.for(HTML_MODULE_TYPE)
					.tap(PLUGIN_NAME, (generatorOptions) => {
						compiler.validate(
							() => getSchema("HtmlGeneratorOptions"),
							generatorOptions,
							generatorValidationOptions,
							(options) =>
								require("../../schemas/plugins/HtmlGeneratorOptions.check")(
									options
								)
						);
						return new HtmlGenerator(generatorOptions, compilation.moduleGraph);
					});

				NormalModule.getCompilationHooks(compilation).processResult.tap(
					PLUGIN_NAME,
					(result, module) => {
						if (module.type === HTML_MODULE_TYPE) {
							const [source, ...rest] = result;
							// `applyTemplate` is a no-op unless `module.parser.html.template`
							// is set. Running it here (where the returned source becomes the
							// module's stored source) keeps the parser's dependency offsets
							// and the generator's render base in sync.
							const parser = /** @type {HtmlParser} */ (module.parser);

							return [parser.applyTemplate(removeBOM(source), module), ...rest];
						}

						return result;
					}
				);

				// Emit extracted `.html` files for any HTML module that opted
				// into extraction. The opt-in is computed by
				// `HtmlGenerator#_shouldExtract`: `module.generator.html.extract:
				// true` always extracts, `false` never extracts, and when
				// `extract` is unset the generator extracts iff the HTML module
				// is a compilation entry — the iteration below picks up only
				// modules whose generator reported the `html` source type, so
				// that decision is honored implicitly. The HTML content is read
				// from the generator's secondary `"html"` source type (see
				// HtmlGenerator#generate). The filename template comes from
				// `output.htmlFilename` (initial chunks) or
				// `output.htmlChunkFilename` (non-initial chunks), mirroring
				// the CSS pipeline. Path data follows the asset-module pattern —
				// `module` + a relative source `filename`, with `chunk`
				// intentionally omitted so `[name]` resolves to the HTML
				// source's basename (e.g. `page` for `./page.html`) rather
				// than the importing chunk's name (e.g. `main`). A per-module
				// content hash is computed from the rewritten HTML so the
				// template's `[contenthash]` placeholder works; the
				// compilation hash is also forwarded so `[fullhash]` /
				// `[hash]` work in user-supplied templates.

				// Sentinel-resolved content and its content hash depend only on
				// the HTML-type module source — not on the chunk or output
				// filename — yet `renderManifest` runs per `(chunk, module)`.
				// Memoize so a module landing in multiple chunks resolves and
				// hashes its sentinels once. Scoped to this compilation because
				// sentinel resolution embeds chunk filenames, which change
				// across rebuilds; weakly keyed by source so entries release.
				/** @type {WeakMap<import("webpack-sources").Source, { resolvedContent: string, contentHash: string }>} */
				const resolvedSentinelHashCache = new WeakMap();

				// Compute a linked/entry HTML page's emitted filename + chunk-URL-resolved
				// content + content hash for one (module, chunk). Shared by the emit loop
				// below and the page-link resolver. The content hash covers only the
				// chunk-URL-resolved source — links to *other* pages stay sentinels here,
				// so a page's filename doesn't depend on the filenames of pages it links to.
				const computePageEmit = (
					/** @type {NormalModule} */ module,
					/** @type {import("../Chunk")} */ chunk
				) => {
					const { chunkGraph, outputOptions } = compilation;
					const codeGenResult =
						/** @type {import("../CodeGenerationResults")} */ (
							compilation.codeGenerationResults
						).get(module, chunk.runtime);
					const placeholderSource = codeGenResult.sources.get(HTML_TYPE);
					if (!placeholderSource) return undefined;
					let cached = resolvedSentinelHashCache.get(placeholderSource);
					if (cached === undefined) {
						// Resolve chunk-URL sentinels *before* hashing so the HTML's
						// `[contenthash]` invalidates with the referenced chunks'
						// filenames. Inlined chunks have no URL, so tag their inline
						// sentinels with the chunk content hash — that keeps the emitted
						// bytes (and RealContentHashPlugin's later recompute)
						// content-dependent, so the page hash tracks inlined content too.
						// Asset URL sentinels (from `HtmlEntryDependency` resource-hint
						// tags) resolve here too — deferred from template.apply so it
						// doesn't race with asset-module codegen.
						const resolvedContent = HtmlGenerator.resolveAssetUrlSentinels(
							HtmlGenerator.embedInlineChunkHashes(
								HtmlGenerator.resolveChunkUrlSentinels(
									/** @type {string} */ (placeholderSource.source()),
									compilation
								),
								compilation
							),
							compilation
						);
						cached = {
							resolvedContent,
							contentHash: HtmlModulesPlugin.computeContentHash(
								resolvedContent,
								outputOptions
							)
						};
						resolvedSentinelHashCache.set(placeholderSource, cached);
					}
					const resource = module.getResource() || module.resource;
					// Synthetic `output.html` entries are `data:text/html` modules with no
					// real basename — name the file after the entry instead.
					const sourceFilename =
						resource.startsWith("data:text/html") && chunk.name
							? chunk.name
							: makePathsRelative(
									compiler.context,
									/** @type {string} */ (resource),
									compiler.root
								).replace(/^\.\//, "");
					const filenameTemplate = HtmlModulesPlugin.getChunkFilenameTemplate(
						chunk,
						outputOptions
					);
					const { path: filename, info } = compilation.getPathWithInfo(
						/** @type {import("../TemplatedPathPlugin").TemplatePath} */
						(filenameTemplate),
						{
							module,
							runtime: chunk.runtime,
							chunkGraph,
							contentHash: cached.contentHash,
							contentHashType: HTML_TYPE,
							filename: sourceFilename,
							hash: compilation.hash
						}
					);
					return {
						resolvedContent: cached.resolvedContent,
						contentHash: cached.contentHash,
						filename,
						info
					};
				};

				// Emitted filename of a linked `type: "html"` page, keyed by its entry
				// name. Looked up from the page's own entry chunk so it's independent of
				// chunk render order; cached for the compilation.
				/** @type {Map<string, string>} */
				const htmlPageFilenameCache = new Map();
				const computePageFilenameByEntry = (
					/** @type {string} */ entryName
				) => {
					const cached = htmlPageFilenameCache.get(entryName);
					if (cached !== undefined) return cached;
					let filename = "data:,";
					const entrypoint = compilation.entrypoints.get(entryName);
					const chunk = entrypoint && entrypoint.getEntrypointChunk();
					if (chunk) {
						const modules =
							compilation.chunkGraph.getOrderedChunkModulesIterableBySourceType(
								chunk,
								HTML_TYPE,
								compareModulesByFullName(compilation.compiler)
							);
						const module = modules && modules[Symbol.iterator]().next().value;
						if (module) {
							const emit = computePageEmit(
								/** @type {NormalModule} */ (module),
								chunk
							);
							if (emit) filename = emit.filename;
						}
					}
					htmlPageFilenameCache.set(entryName, filename);
					return filename;
				};

				compilation.hooks.renderManifest.tap(
					PLUGIN_NAME,
					(result, { chunk }) => {
						// HMR's `HotUpdateChunk`s flow through the same hook
						// but aren't real output chunks — extracting `.html`
						// for them would create stray hot-update HTML files.
						// `CssModulesPlugin` early-returns for the same reason.
						if (chunk instanceof HotUpdateChunk) return result;
						const { chunkGraph } = compilation;
						const modules =
							chunkGraph.getOrderedChunkModulesIterableBySourceType(
								chunk,
								HTML_TYPE,
								compareModulesByFullName(compilation.compiler)
							);
						if (!modules) return result;
						const outputOptions = compilation.outputOptions;
						for (const module of modules) {
							const normalModule = /** @type {NormalModule} */ (module);
							// `<iframe srcdoc>` modules expose `html` only so HtmlInlineHtmlDependency
							// can write the processed markup back into the host attribute — they are
							// never standalone pages. `generator.extract: "inline"` marks them so no
							// `.html` file is emitted; without this they'd collide on the
							// `data:text/html` → chunk-name path (every srcdoc module in a chunk would
							// emit `<chunk>.html`). An O(1) flag check, not a scan.
							const generatorOptions = normalModule.generatorOptions;
							if (generatorOptions && generatorOptions.extract === "inline") {
								continue;
							}

							const emit = computePageEmit(normalModule, chunk);
							if (!emit) continue;
							const { resolvedContent, contentHash, filename, info } = emit;

							// Resolve any remaining `[webpack/auto]` placeholders to an undo
							// path computed from the emitted HTML's location, so asset/chunk
							// URLs stay relative to `output.path` even when the page emits into
							// a subdirectory. A relative `<base href>` prepends `../`s so the
							// base can't misdirect the rewritten URLs (see `HtmlParser`).
							const basePrefix =
								/** @type {HtmlModuleBuildInfo} */ (normalModule.buildInfo)
									.baseUrlPrefix || "";
							const undoPath =
								basePrefix +
								getUndoPath(
									filename,
									/** @type {string} */ (outputOptions.path),
									false
								);
							// Resolve linked-page (`type: "html"`) sentinels to each page's
							// emitted filename before the undo path, so the href is relative to
							// this page.
							const finalContent = HtmlGenerator.resolveHtmlPageUrlSentinels(
								resolvedContent,
								computePageFilenameByEntry
							)
								.split(autoPlaceholder)
								.join(undoPath);
							const finalSource = new RawSource(finalContent);
							// The same HTML module can land in multiple chunks with different
							// `htmlFilename`/`htmlChunkFilename` shapes → different `undoPath`s and
							// final content for the same module id. Include the emitted filename in
							// the asset cache key and the post-undo-path content in the hash so the
							// asset cache can't reuse one variant's bytes at another variant's URL.
							// Unchanged content reuses the memoized hash instead of re-digesting.
							const finalContentHash =
								finalContent === resolvedContent
									? contentHash
									: HtmlModulesPlugin.computeContentHash(
											finalContent,
											outputOptions
										);

							// Track HTML pages for the integrity sentinel pass (never JS chunks).
							getState(compilation).htmlAssetNames.add(filename);

							result.push({
								render: () => finalSource,
								filename,
								info,
								auxiliary: true,
								identifier: `htmlModule${chunkGraph.getModuleId(
									module
								)}|${filename}`,
								hash: finalContentHash
							});
						}
						return result;
					}
				);

				// Resolve sentinels at JS chunk render time so later passes
				// (SourceMapDevToolPlugin, size optimizers, RealContentHash) see resolved bytes.
				const jsHooks =
					JavascriptModulesPlugin.getCompilationHooks(compilation);
				jsHooks.render.tap(PLUGIN_NAME, (source, renderContext) => {
					// No HTML modules ⇒ no sentinels; skip materializing the JS source.
					if (htmlModules.size === 0) return source;
					const raw = source.source();
					if (typeof raw !== "string") return source;
					if (
						!raw.includes("__WEBPACK_HTML_CHUNK_URL__") &&
						!raw.includes("__WEBPACK_HTML_PAGE_URL__") &&
						!raw.includes("__WEBPACK_HTML_INTEGRITY__") &&
						!raw.includes("__WEBPACK_HTML_INLINE__") &&
						!raw.includes("__WEBPACK_HTML_ASSET_URL__")
					) {
						return source;
					}
					// Strip integrity and inline sentinels (not resolve): a JS chunk
					// can't hold real SRI hashes for its own not-yet-final bytes, and
					// inline content belongs only in the final .html, never in JS bundles.
					const resolved = HtmlGenerator.stripChunkIntegritySentinels(
						HtmlGenerator.resolveAssetUrlSentinels(
							HtmlGenerator.resolveHtmlPageUrlSentinels(
								HtmlGenerator.resolveChunkUrlSentinels(raw, compilation),
								computePageFilenameByEntry
							),
							compilation
						)
							.split(autoPlaceholder)
							.join("")
					).replace(
						/__WEBPACK_HTML_INLINE__[0-9a-f]+__[a-z]+(?:__[0-9a-f]+)?__END__/g,
						""
					);
					if (resolved === raw) return source;
					const chunkId = String(renderContext.chunk.id);
					const prior = sentinelResolvedSourceCache.get(chunkId);
					if (prior !== undefined && prior.content === resolved) {
						return prior.source;
					}
					const newSource = new RawSource(resolved);
					sentinelResolvedSourceCache.set(chunkId, {
						content: resolved,
						source: newSource
					});
					return newSource;
				});

				// Prune cache entries for chunks no longer in the graph so a
				// long watch session can't accumulate stale entries.
				compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
					if (sentinelResolvedSourceCache.size === 0) return;
					const live = new Set();
					for (const chunk of compilation.chunks) {
						live.add(String(chunk.id));
					}
					for (const id of sentinelResolvedSourceCache.keys()) {
						if (!live.has(id)) sentinelResolvedSourceCache.delete(id);
					}
				});
			}
		);
	}
}

/**
 * Per-compilation hooks for the experimental HTML support.
 * @param {Compilation} compilation the compilation
 * @returns {HtmlCompilationHooks} the hooks
 */
HtmlModulesPlugin.getCompilationHooks = createHooksRegistry(
	() =>
		/** @type {HtmlCompilationHooks} */ ({
			injectTags: new AsyncSeriesWaterfallHook(["tags", "context"]),
			transformTags: new AsyncSeriesHook(["tags", "context"]),
			transformHtml: new AsyncSeriesWaterfallHook(["html", "context"]),
			htmlEmitted: new AsyncSeriesHook(["context"])
		})
);

module.exports = HtmlModulesPlugin;
