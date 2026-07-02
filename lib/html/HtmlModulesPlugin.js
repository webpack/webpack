/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { RawSource } = require("webpack-sources");
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
const { compareModulesByFullName } = require("../util/comparators");
const createHash = require("../util/createHash");
const { digestNonNumericOnly } = require("../util/nonNumericOnlyHash");
const removeBOM = require("../util/removeBOM");
const HtmlGenerator = require("./HtmlGenerator");
const HtmlModule = require("./HtmlModule");
const HtmlParser = require("./HtmlParser");

/** @typedef {import("../../declarations/WebpackOptions").EntryDescriptionNormalized} EntryDescriptionNormalized */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("./HtmlModule").HtmlModuleBuildInfo} HtmlModuleBuildInfo */
/** @typedef {{ request: string, entryName: string, type: "script" | "script-module" | "modulepreload" | "stylesheet" }} EntryScriptInfo */

const PLUGIN_NAME = "HtmlModulesPlugin";

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
				return `data:text/html,<!doctype html><html><head>${links.join(
					""
				)}</head><body>${scripts.join("")}</body></html>`;
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
		/** @type {WeakMap<import("../Compilation"), Set<string>>} */
		const stylesheetEntriesPerCompilation = new WeakMap();
		compiler.hooks.finishMake.tapAsync(PLUGIN_NAME, (compilation, callback) => {
			/** @type {Promise<void>[]} */
			const promises = [];
			/** @type {Set<string>} */
			const stylesheetEntries = new Set();
			stylesheetEntriesPerCompilation.set(compilation, stylesheetEntries);

			for (const module of compilation.modules) {
				if (module.type !== HTML_MODULE_TYPE) continue;
				const buildInfo = /** @type {HtmlModuleBuildInfo | undefined} */ (
					module.buildInfo
				);
				const htmlEntryScripts = buildInfo && buildInfo.htmlEntryScripts;
				if (!htmlEntryScripts) continue;

				const context = /** @type {string} */ (module.context);

				for (const [groupKind, group] of Object.entries(htmlEntryScripts)) {
					// Only the script chains (`script`, `script-module`) need a
					// shared runtime via leader-only `dependOn` — the others
					// either preload without executing (`modulepreload`) or
					// produce CSS chunks (`stylesheet`) which have no runtime
					// to share. CSS entries must NOT chain into a JS leader
					// either, because the resulting chunk would mix a CSS
					// stylesheet with a JS runtime.
					const isChainGroup =
						groupKind !== "modulepreload" && groupKind !== "stylesheet";
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
						if (groupKind === "stylesheet") {
							stylesheetEntries.add(entry.entryName);
						}
						promises.push(
							new Promise((resolve, reject) => {
								compilation.addEntry(
									context,
									EntryPlugin.createDependency(entry.request, {
										name: entry.entryName
									}),
									{
										name: entry.entryName,
										// Each script src / modulepreload entry gets its own
										// filename derived from the synthetic entry name so it
										// doesn't collide with the user's `output.filename`.
										// For CSS entries the JS `filename` is irrelevant (no
										// `.js` is emitted) — the CSS file's name is set on the
										// chunk via `cssFilenameTemplate` in `afterChunks` below.
										filename:
											compilation.outputOptions.chunkFilename || "[name].js",
										dependOn
									},
									(err) => {
										if (err) reject(err);
										else resolve();
									}
								);
							})
						);
					}
				}
			}

			Promise.all(promises).then(
				() => callback(),
				(err) => callback(err)
			);
		});

		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				// CSS entries created by `<link rel="stylesheet">` in HTML need
				// their `.css` filename set via `chunk.cssFilenameTemplate`
				// (the field `CssModulesPlugin.getChunkFilenameTemplate` reads).
				// Compilation only flows `options.filename` to `chunk.filenameTemplate`,
				// which controls JS emit — there's no entry-level `cssFilename`.
				// Set it ourselves after chunks are created so each stylesheet
				// entry emits to a distinct file derived from `output.cssFilename`
				// (or `output.cssChunkFilename` for non-initial CSS chunks).
				compilation.hooks.afterChunks.tap(PLUGIN_NAME, () => {
					const stylesheetEntries =
						stylesheetEntriesPerCompilation.get(compilation);
					if (!stylesheetEntries || stylesheetEntries.size === 0) return;
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
				const {
					getUndoPath,
					makePathsRelative
				} = require("../util/identifier");
				const {
					PUBLIC_PATH_AUTO: autoPlaceholder
				} = require("../util/publicPathPlaceholder");

				// Sentinel-resolved content and its content hash depend only on
				// the HTML-type module source — not on the chunk or output
				// filename — yet `renderManifest` runs per `(chunk, module)`.
				// Memoize so a module landing in multiple chunks resolves and
				// hashes its sentinels once. Scoped to this compilation because
				// sentinel resolution embeds chunk filenames, which change
				// across rebuilds; weakly keyed by source so entries release.
				/** @type {WeakMap<import("webpack-sources").Source, { resolvedContent: string, contentHash: string }>} */
				const resolvedSentinelHashCache = new WeakMap();

				compilation.hooks.renderManifest.tap(
					PLUGIN_NAME,
					(result, { chunk, codeGenerationResults, hash: compilationHash }) => {
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
							const codeGenResult = codeGenerationResults.get(
								module,
								chunk.runtime
							);
							const placeholderSource = codeGenResult.sources.get(HTML_TYPE);
							if (!placeholderSource) continue;

							// `<iframe srcdoc>` modules expose `html` only so
							// HtmlInlineHtmlDependency can write the processed markup back
							// into the host attribute — they are never standalone pages.
							// `generator.extract: "inline"` marks them so no `.html` file is
							// emitted; without this they'd collide on the `data:text/html`
							// → chunk-name path below (every srcdoc module in a chunk would
							// emit `<chunk>.html`). An O(1) flag check, not a scan.
							const generatorOptions = normalModule.generatorOptions;
							if (generatorOptions && generatorOptions.extract === "inline") {
								continue;
							}

							const filenameTemplate = chunk.canBeInitial()
								? outputOptions.htmlFilename
								: outputOptions.htmlChunkFilename;

							const resource =
								normalModule.getResource() || normalModule.resource;
							// Synthetic `output.html` entries are `data:text/html` modules
							// with no real basename — name the file after the entry instead.
							const sourceFilename =
								resource.startsWith("data:text/html") && chunk.name
									? chunk.name
									: makePathsRelative(
											compiler.context,
											/** @type {string} */ (resource),
											compiler.root
										).replace(/^\.\//, "");

							let cached = resolvedSentinelHashCache.get(placeholderSource);
							if (cached === undefined) {
								const placeholderContent = /** @type {string} */ (
									placeholderSource.source()
								);
								// Resolve sentinels *before* hashing so the HTML's `[contenthash]`
								// invalidates with the referenced chunks' filenames.
								const resolvedContent = HtmlGenerator.resolveChunkUrlSentinels(
									placeholderContent,
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
							const { resolvedContent, contentHash } = cached;

							const { path: filename, info } = compilation.getPathWithInfo(
								/** @type {import("../TemplatedPathPlugin").TemplatePath} */
								(filenameTemplate),
								{
									module,
									runtime: chunk.runtime,
									chunkGraph,
									contentHash,
									contentHashType: HTML_TYPE,
									filename: sourceFilename,
									hash: compilationHash
								}
							);

							// Resolve any remaining `[webpack/auto]` placeholders to
							// an undo path computed from the emitted HTML's location.
							// Without this, an `output.htmlFilename` that emits into
							// a subdirectory (e.g. `pages/[name].html`) would leave
							// asset URLs like `image.png` and chunk URLs like
							// `main.js` root-relative, so the browser would resolve
							// them under the HTML's directory instead of the
							// `output.path` root.
							// A relative `<base href>` prepends `../`s so the base can't
							// misdirect the rewritten URLs (see `HtmlParser`).
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
							const finalContent = resolvedContent.includes(autoPlaceholder)
								? resolvedContent.split(autoPlaceholder).join(undoPath)
								: resolvedContent;
							const finalSource = new RawSource(finalContent);
							// The same HTML module can land in multiple chunks
							// with different `output.htmlFilename` /
							// `output.htmlChunkFilename` shapes, which means
							// different `undoPath`s and therefore different
							// final content for the same module id. Include
							// the emitted filename in the asset cache key and
							// the post-undo-path content in the hash, so the
							// asset cache can't reuse one variant's bytes at
							// another variant's URL. Unchanged content reuses
							// the memoized hash instead of re-digesting.
							const finalContentHash =
								finalContent === resolvedContent
									? contentHash
									: HtmlModulesPlugin.computeContentHash(
											finalContent,
											outputOptions
										);

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
				const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");

				const jsHooks =
					JavascriptModulesPlugin.getCompilationHooks(compilation);
				jsHooks.render.tap(PLUGIN_NAME, (source, renderContext) => {
					const raw = source.source();
					if (typeof raw !== "string") return source;
					if (!raw.includes("__WEBPACK_HTML_CHUNK_URL__")) return source;
					const resolved = HtmlGenerator.resolveChunkUrlSentinels(
						raw,
						compilation
					)
						.split(autoPlaceholder)
						.join("");
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

module.exports = HtmlModulesPlugin;
