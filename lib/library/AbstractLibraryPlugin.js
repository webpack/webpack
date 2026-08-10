/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../../declarations/WebpackOptions").LibraryType} LibraryType */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compilation").ChunkHashContext} ChunkHashContext */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").RuntimeRequirements} RuntimeRequirements */
/** @typedef {import("../javascript/JavascriptModulesPlugin").RenderContext} RenderContext */
/** @typedef {import("../javascript/JavascriptModulesPlugin").StartupRenderContext} StartupRenderContext */
/** @typedef {import("../javascript/JavascriptModulesPlugin").ModuleRenderContext} ModuleRenderContext */
/** @typedef {import("../util/Hash")} Hash */

const COMMON_LIBRARY_NAME_MESSAGE =
	"Common configuration options that specific library names are 'output.library[.name]', 'entry.xyz.library[.name]', 'ModuleFederationPlugin.name' and 'ModuleFederationPlugin.library[.name]'.";

/**
 * Defines the library context type used by this module.
 * @template T
 * @typedef {object} LibraryContext
 * @property {Compilation} compilation
 * @property {ChunkGraph} chunkGraph
 * @property {T} options
 */

/**
 * Defines the abstract library plugin options type used by this module.
 * @typedef {object} AbstractLibraryPluginOptions
 * @property {string} pluginName name of the plugin
 * @property {LibraryType} type used library type
 * @property {boolean=} finishAllEntryModules when true, finishEntryModule is called for every entry dependency instead of only the last one, so exports of all entry modules survive optimization
 */

/**
 * Represents AbstractLibraryPlugin.
 * @template T
 */
class AbstractLibraryPlugin {
	/**
	 * Creates an instance of AbstractLibraryPlugin.
	 * @param {AbstractLibraryPluginOptions} options options
	 */
	constructor({ pluginName, type, finishAllEntryModules }) {
		/** @type {AbstractLibraryPluginOptions["pluginName"]} */
		this._pluginName = pluginName;
		/** @type {AbstractLibraryPluginOptions["type"]} */
		this._type = type;
		/** @type {boolean} */
		this._finishAllEntryModules = finishAllEntryModules || false;
		/** @type {WeakMap<LibraryOptions, T>} */
		this._parseCache = new WeakMap();
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const { _pluginName } = this;
		compiler.hooks.thisCompilation.tap(_pluginName, (compilation) => {
			compilation.hooks.finishModules.tap(
				{ name: _pluginName, stage: 10 },
				() => {
					for (const [
						name,
						{
							dependencies: deps,
							options: { library }
						}
					] of compilation.entries) {
						const options = this._parseOptionsCached(
							library !== undefined
								? library
								: compilation.outputOptions.library
						);
						if (options !== false) {
							const relevantDeps = this._finishAllEntryModules
								? deps
								: deps.slice(-1);
							for (const dep of relevantDeps) {
								const module = compilation.moduleGraph.getModule(dep);
								if (module) {
									this.finishEntryModule(module, name, {
										options,
										compilation,
										chunkGraph: compilation.chunkGraph
									});
								}
							}
						}
					}
				}
			);

			/**
			 * Gets options for chunk.
			 * @param {Chunk} chunk chunk
			 * @returns {T | false} options for the chunk
			 */
			const getOptionsForChunk = (chunk) => {
				if (compilation.chunkGraph.getNumberOfEntryModules(chunk) === 0) {
					return false;
				}
				const options = chunk.getEntryOptions();
				const library = options && options.library;
				return this._parseOptionsCached(
					library !== undefined ? library : compilation.outputOptions.library
				);
			};

			if (
				this.render !== AbstractLibraryPlugin.prototype.render ||
				this.runtimeRequirements !==
					AbstractLibraryPlugin.prototype.runtimeRequirements
			) {
				compilation.hooks.additionalChunkRuntimeRequirements.tap(
					_pluginName,
					(chunk, set, { chunkGraph }) => {
						const options = getOptionsForChunk(chunk);
						if (options !== false) {
							this.runtimeRequirements(chunk, set, {
								options,
								compilation,
								chunkGraph
							});
						}
					}
				);
			}

			const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);

			if (this.render !== AbstractLibraryPlugin.prototype.render) {
				hooks.render.tap(_pluginName, (source, renderContext) => {
					const options = getOptionsForChunk(renderContext.chunk);
					if (options === false) return source;
					return this.render(source, renderContext, {
						options,
						compilation,
						chunkGraph: compilation.chunkGraph
					});
				});
			}

			if (this._finishAllEntryModules) {
				hooks.inlineInRuntimeBailout.tap(_pluginName, (module, context) => {
					const options = getOptionsForChunk(context.chunk);
					if (options === false) return;
					if (
						this._getMergeableEntryModules(
							compilation.chunkGraph,
							context.chunk
						).length > 0
					) {
						return "the exports of multiple entry modules are merged into the library export";
					}
				});
			}

			if (
				this.embedInRuntimeBailout !==
				AbstractLibraryPlugin.prototype.embedInRuntimeBailout
			) {
				hooks.embedInRuntimeBailout.tap(
					_pluginName,
					(module, renderContext) => {
						const options = getOptionsForChunk(renderContext.chunk);
						if (options === false) return;
						return this.embedInRuntimeBailout(module, renderContext, {
							options,
							compilation,
							chunkGraph: compilation.chunkGraph
						});
					}
				);
			}

			if (
				this.strictRuntimeBailout !==
				AbstractLibraryPlugin.prototype.strictRuntimeBailout
			) {
				hooks.strictRuntimeBailout.tap(_pluginName, (renderContext) => {
					const options = getOptionsForChunk(renderContext.chunk);
					if (options === false) return;
					return this.strictRuntimeBailout(renderContext, {
						options,
						compilation,
						chunkGraph: compilation.chunkGraph
					});
				});
			}

			if (
				this.renderModuleContent !==
				AbstractLibraryPlugin.prototype.renderModuleContent
			) {
				hooks.renderModuleContent.tap(
					_pluginName,
					(source, module, renderContext) =>
						this.renderModuleContent(source, module, renderContext, {
							compilation,
							chunkGraph: compilation.chunkGraph
						})
				);
			}

			if (
				this.renderStartup !== AbstractLibraryPlugin.prototype.renderStartup
			) {
				hooks.renderStartup.tap(
					_pluginName,
					(source, module, renderContext) => {
						const options = getOptionsForChunk(renderContext.chunk);
						if (options === false) return source;
						return this.renderStartup(source, module, renderContext, {
							options,
							compilation,
							chunkGraph: compilation.chunkGraph
						});
					}
				);
			}

			hooks.chunkHash.tap(_pluginName, (chunk, hash, context) => {
				const options = getOptionsForChunk(chunk);
				if (options === false) return;
				this.chunkHash(chunk, hash, context, {
					options,
					compilation,
					chunkGraph: compilation.chunkGraph
				});
			});
		});
	}

	/**
	 * Parse options cached.
	 * @param {LibraryOptions=} library normalized library option
	 * @returns {T | false} preprocess as needed by overriding
	 */
	_parseOptionsCached(library) {
		if (!library) return false;
		if (library.type !== this._type) return false;
		const cacheEntry = this._parseCache.get(library);
		if (cacheEntry !== undefined) return cacheEntry;
		const result = this.parseOptions(library);
		this._parseCache.set(library, result);
		return result;
	}

	/* istanbul ignore next */
	/**
	 * Returns preprocess as needed by overriding.
	 * @abstract
	 * @param {LibraryOptions} library normalized library option
	 * @returns {T} preprocess as needed by overriding
	 */
	parseOptions(library) {
		const AbstractMethodError = require("../errors/AbstractMethodError");

		throw new AbstractMethodError();
	}

	/**
	 * Finish entry module.
	 * @param {Module} module the exporting entry module
	 * @param {string} entryName the name of the entrypoint
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {void}
	 */
	finishEntryModule(module, entryName, libraryContext) {}

	/**
	 * Get all javascript entry modules of a chunk that can take part in
	 * merging exports into the library exports object. Returns an empty array
	 * when merging is not applicable (single entry, or an entry depends on
	 * other chunks so startup is delayed).
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {Chunk} chunk the chunk
	 * @returns {Module[]} the entry modules
	 */
	_getMergeableEntryModules(chunkGraph, chunk) {
		/** @type {Module[]} */
		const entries = [];
		for (const [
			module,
			entrypoint
		] of chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)) {
			if (!chunkGraph.getModuleSourceTypes(module).has("javascript")) continue;
			if (entrypoint && entrypoint.chunks.some((c) => c !== chunk)) {
				// entry depends on other chunks, startup is delayed and
				// exports are not synchronously available for merging
				return [];
			}
			entries.push(module);
		}
		return entries.length > 1 ? entries : [];
	}

	/**
	 * Render code that merges the exports of all entry modules of the chunk
	 * into the final library exports object. Returns an empty string when the
	 * chunk has fewer than two mergeable entry modules. Later entry modules
	 * override earlier ones on export name conflicts, which keeps the
	 * documented "last entry wins" semantics for conflicting names.
	 * @param {StartupRenderContext} renderContext render context
	 * @returns {string} the merge code or an empty string
	 */
	_renderEntryExportsMerge(renderContext) {
		const { chunk, chunkGraph, inlined } = renderContext;
		if (inlined) return "";
		const entries = this._getMergeableEntryModules(chunkGraph, chunk);
		if (entries.length === 0) return "";
		const buf = [
			"// merge exports of all entry modules into the library exports object",
			"// entries are merged in reverse order and existing keys are skipped,",
			"// so later entry modules win on export name conflicts",
			"var __webpack_exports_merged__ = {};",
			"var __webpack_merge_entry__ = function (exports) {",
			Template.indent([
				"for (var key in exports) {",
				Template.indent([
					"if (Object.prototype.hasOwnProperty.call(exports, key) && !Object.prototype.hasOwnProperty.call(__webpack_exports_merged__, key)) {",
					Template.indent(
						"Object.defineProperty(__webpack_exports_merged__, key, Object.getOwnPropertyDescriptor(exports, key));"
					),
					"}"
				]),
				"}"
			]),
			"};"
		];
		buf.push(`__webpack_merge_entry__(${RuntimeGlobals.exports});`);
		for (const module of entries.slice(0, -1).reverse()) {
			buf.push(
				`__webpack_merge_entry__(${RuntimeGlobals.require}(${JSON.stringify(
					chunkGraph.getModuleId(module)
				)}));`
			);
		}
		buf.push(
			`if (${RuntimeGlobals.exports}.__esModule) ${RuntimeGlobals.makeNamespaceObject}(__webpack_exports_merged__);`
		);
		buf.push(`${RuntimeGlobals.exports} = __webpack_exports_merged__;`);
		return `${Template.asString(buf)}\n`;
	}

	/**
	 * Add the runtime requirements needed by the entry exports merge code
	 * when the chunk has multiple mergeable entry modules.
	 * @param {Chunk} chunk the chunk
	 * @param {RuntimeRequirements} set runtime requirements
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	_addEntryExportsMergeRuntimeRequirements(chunk, set, chunkGraph) {
		if (this._getMergeableEntryModules(chunkGraph, chunk).length > 0) {
			set.add(RuntimeGlobals.require);
			set.add(RuntimeGlobals.makeNamespaceObject);
		}
	}

	/**
	 * Embed in runtime bailout.
	 * @param {Module} module the exporting entry module
	 * @param {RenderContext} renderContext render context
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {string | undefined} bailout reason
	 */
	embedInRuntimeBailout(module, renderContext, libraryContext) {
		return undefined;
	}

	/**
	 * Strict runtime bailout.
	 * @param {RenderContext} renderContext render context
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {string | undefined} bailout reason
	 */
	strictRuntimeBailout(renderContext, libraryContext) {
		return undefined;
	}

	/**
	 * Processes the provided chunk.
	 * @param {Chunk} chunk the chunk
	 * @param {RuntimeRequirements} set runtime requirements
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {void}
	 */
	runtimeRequirements(chunk, set, libraryContext) {
		if (this.render !== AbstractLibraryPlugin.prototype.render) {
			set.add(RuntimeGlobals.returnExportsFromRuntime);
		}
	}

	/**
	 * Returns source with library export.
	 * @param {Source} source source
	 * @param {RenderContext} renderContext render context
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {Source} source with library export
	 */
	render(source, renderContext, libraryContext) {
		return source;
	}

	/**
	 * Renders source with library export.
	 * @param {Source} source source
	 * @param {Module} module module
	 * @param {StartupRenderContext} renderContext render context
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {Source} source with library export
	 */
	renderStartup(source, module, renderContext, libraryContext) {
		return source;
	}

	/**
	 * Renders module content.
	 * @param {Source} source source
	 * @param {Module} module module
	 * @param {ModuleRenderContext} renderContext render context
	 * @param {Omit<LibraryContext<T>, "options">} libraryContext context
	 * @returns {Source} source with library export
	 */
	renderModuleContent(source, module, renderContext, libraryContext) {
		return source;
	}

	/**
	 * Processes the provided chunk.
	 * @param {Chunk} chunk the chunk
	 * @param {Hash} hash hash
	 * @param {ChunkHashContext} chunkHashContext chunk hash context
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {void}
	 */
	chunkHash(chunk, hash, chunkHashContext, libraryContext) {
		const options = this._parseOptionsCached(
			libraryContext.compilation.outputOptions.library
		);
		hash.update(this._pluginName);
		hash.update(JSON.stringify(options));
	}
}

AbstractLibraryPlugin.COMMON_LIBRARY_NAME_MESSAGE = COMMON_LIBRARY_NAME_MESSAGE;

module.exports = AbstractLibraryPlugin;
