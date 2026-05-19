/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { RawSource } = require("webpack-sources");
const EntryPlugin = require("../EntryPlugin");
const HotUpdateChunk = require("../HotUpdateChunk");
const { HTML_TYPE } = require("../ModuleSourceTypeConstants");
const { HTML_MODULE_TYPE } = require("../ModuleTypeConstants");
const NormalModule = require("../NormalModule");
const ConstDependency = require("../dependencies/ConstDependency");
const HtmlInlineScriptDependency = require("../dependencies/HtmlInlineScriptDependency");
const HtmlInlineStyleDependency = require("../dependencies/HtmlInlineStyleDependency");
const HtmlScriptSrcDependency = require("../dependencies/HtmlScriptSrcDependency");
const HtmlSourceDependency = require("../dependencies/HtmlSourceDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const { compareModulesByFullName } = require("../util/comparators");
const removeBOM = require("../util/removeBOM");
const HtmlGenerator = require("./HtmlGenerator");
const HtmlParser = require("./HtmlParser");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {{ request: string, entryName: string, kind: "classic" | "esm-script" | "modulepreload" | "stylesheet" }} EntryScriptInfo */

const PLUGIN_NAME = "HtmlModulesPlugin";

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

class HtmlModulesPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		// `<script src>` and `<link rel="modulepreload">` references collected
		// by HtmlParser become real compilation entries here. The classic
		// and esm-script groups are chained via a leader-only dependOn so
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
				const buildInfo = module.buildInfo;
				const htmlEntryScripts =
					buildInfo &&
					/** @type {Record<string, EntryScriptInfo[]> | undefined} */
					(buildInfo.htmlEntryScripts);
				if (!htmlEntryScripts) continue;

				const context = /** @type {string} */ (module.context);

				for (const [groupKind, group] of Object.entries(htmlEntryScripts)) {
					// Only the script chains (`classic`, `esm-script`) need a
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
					HtmlScriptSrcDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HtmlScriptSrcDependency,
					new HtmlScriptSrcDependency.Template()
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
				const cssEnabled = Boolean(
					compiler.options.experiments && compiler.options.experiments.css
				);
				normalModuleFactory.hooks.createParser
					.for(HTML_MODULE_TYPE)
					.tap(
						PLUGIN_NAME,
						() =>
							new HtmlParser(
								compilation.outputOptions.hashFunction,
								compiler.context,
								compilation.outputOptions.module,
								cssEnabled
							)
					);

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
						return new HtmlGenerator(
							/** @type {import("../../declarations/WebpackOptions").HtmlGeneratorOptions} */
							(generatorOptions),
							compilation.moduleGraph
						);
					});

				NormalModule.getCompilationHooks(compilation).processResult.tap(
					PLUGIN_NAME,
					(result, module) => {
						if (module.type === HTML_MODULE_TYPE) {
							const [source, ...rest] = result;

							return [removeBOM(source), ...rest];
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
				const createHash = require("../util/createHash");
				const nonNumericOnlyHash = require("../util/nonNumericOnlyHash");
				const CssUrlDependency = require("../dependencies/CssUrlDependency");

				const autoPlaceholder = CssUrlDependency.PUBLIC_PATH_AUTO;

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

							const filenameTemplate = chunk.canBeInitial()
								? outputOptions.htmlFilename
								: outputOptions.htmlChunkFilename;

							const sourceFilename = makePathsRelative(
								compiler.context,
								/** @type {string} */
								(normalModule.getResource() || normalModule.resource),
								compiler.root
							).replace(/^\.\//, "");

							const placeholderContent = /** @type {string} */ (
								placeholderSource.source()
							);
							const hashInput = createHash(outputOptions.hashFunction);
							if (outputOptions.hashSalt) {
								hashInput.update(outputOptions.hashSalt);
							}
							hashInput.update(placeholderContent);
							const fullContentHash = /** @type {string} */ (
								hashInput.digest(outputOptions.hashDigest)
							);
							const contentHash = nonNumericOnlyHash(
								fullContentHash,
								outputOptions.hashDigestLength
							);

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
							const undoPath = getUndoPath(
								filename,
								/** @type {string} */ (outputOptions.path),
								false
							);
							const finalContent = placeholderContent
								.split(autoPlaceholder)
								.join(undoPath);
							const finalSource = new RawSource(finalContent);
							// The same HTML module can land in multiple chunks
							// with different `output.htmlFilename` /
							// `output.htmlChunkFilename` shapes, which means
							// different `undoPath`s and therefore different
							// final content for the same module id. Include
							// the emitted filename in the asset cache key and
							// the post-undo-path content in the hash, so the
							// asset cache can't reuse one variant's bytes at
							// another variant's URL.
							const finalHash = createHash(outputOptions.hashFunction);
							if (outputOptions.hashSalt) {
								finalHash.update(outputOptions.hashSalt);
							}
							finalHash.update(finalContent);
							const finalContentHash = nonNumericOnlyHash(
								/** @type {string} */ (
									finalHash.digest(outputOptions.hashDigest)
								),
								outputOptions.hashDigestLength
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
			}
		);
	}
}

module.exports = HtmlModulesPlugin;
