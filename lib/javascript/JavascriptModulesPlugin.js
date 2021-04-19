/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook, SyncHook, SyncBailHook } = require("tapable");
const vm = require("vm");
const {
	ConcatSource,
	OriginalSource,
	PrefixSource,
	RawSource,
	CachedSource
} = require("webpack-sources");
const Compilation = require("../Compilation");
const { tryRunOrWebpackError } = require("../HookWebpackError");
const HotUpdateChunk = require("../HotUpdateChunk");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const { last, someInIterable } = require("../util/IterableHelpers");
const StringXor = require("../util/StringXor");
const { compareModulesByIdentifier } = require("../util/comparators");
const createHash = require("../util/createHash");
const { intersectRuntime } = require("../util/runtime");
const JavascriptGenerator = require("./JavascriptGenerator");
const JavascriptParser = require("./JavascriptParser");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("../Compilation").ChunkHashContext} ChunkHashContext */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../util/Hash")} Hash */

/**
 * @param {Chunk} chunk a chunk
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @returns {boolean} true, when a JS file is needed for this chunk
 */
const chunkHasJs = (chunk, chunkGraph) => {
	if (chunkGraph.getNumberOfEntryModules(chunk) > 0) return true;

	return chunkGraph.getChunkModulesIterableBySourceType(chunk, "javascript")
		? true
		: false;
};

const printGeneratedCodeForStack = (module, code) => {
	const lines = code.split("\n");
	const n = `${lines.length}`.length;
	return `\n\nGenerated code for ${module.identifier()}\n${lines
		.map((line, i, lines) => {
			const iStr = `${i + 1}`;
			return `${" ".repeat(n - iStr.length)}${iStr} | ${line}`;
		})
		.join("\n")}`;
};

/**
 * @typedef {Object} RenderContext
 * @property {Chunk} chunk the chunk
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 * @property {CodeGenerationResults} codeGenerationResults results of code generation
 */

/**
 * @typedef {Object} MainRenderContext
 * @property {Chunk} chunk the chunk
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 * @property {CodeGenerationResults} codeGenerationResults results of code generation
 * @property {string} hash hash to be used for render call
 */

/**
 * @typedef {Object} RenderBootstrapContext
 * @property {Chunk} chunk the chunk
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 * @property {string} hash hash to be used for render call
 */

/** @typedef {RenderContext & { inlined: boolean }} StartupRenderContext */

/**
 * @typedef {Object} CompilationHooks
 * @property {SyncWaterfallHook<[Source, Module, RenderContext]>} renderModuleContent
 * @property {SyncWaterfallHook<[Source, Module, RenderContext]>} renderModuleContainer
 * @property {SyncWaterfallHook<[Source, Module, RenderContext]>} renderModulePackage
 * @property {SyncWaterfallHook<[Source, RenderContext]>} renderChunk
 * @property {SyncWaterfallHook<[Source, RenderContext]>} renderMain
 * @property {SyncWaterfallHook<[Source, RenderContext]>} render
 * @property {SyncWaterfallHook<[Source, Module, StartupRenderContext]>} renderStartup
 * @property {SyncWaterfallHook<[string, RenderBootstrapContext]>} renderRequire
 * @property {SyncBailHook<[Module, RenderBootstrapContext], string>} inlineInRuntimeBailout
 * @property {SyncBailHook<[Module, RenderContext], string>} embedInRuntimeBailout
 * @property {SyncBailHook<[RenderContext], string>} strictRuntimeBailout
 * @property {SyncHook<[Chunk, Hash, ChunkHashContext]>} chunkHash
 * @property {SyncBailHook<[Chunk, RenderContext], boolean>} useSourceMap
 */

/** @type {WeakMap<Compilation, CompilationHooks>} */
const compilationHooksMap = new WeakMap();

class JavascriptModulesPlugin {
	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {CompilationHooks} the attached hooks
	 */
	static getCompilationHooks(compilation) {
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation"
			);
		}
		let hooks = compilationHooksMap.get(compilation);
		if (hooks === undefined) {
			hooks = {
				renderModuleContent: new SyncWaterfallHook([
					"source",
					"module",
					"renderContext"
				]),
				renderModuleContainer: new SyncWaterfallHook([
					"source",
					"module",
					"renderContext"
				]),
				renderModulePackage: new SyncWaterfallHook([
					"source",
					"module",
					"renderContext"
				]),
				render: new SyncWaterfallHook(["source", "renderContext"]),
				renderStartup: new SyncWaterfallHook([
					"source",
					"module",
					"startupRenderContext"
				]),
				renderChunk: new SyncWaterfallHook(["source", "renderContext"]),
				renderMain: new SyncWaterfallHook(["source", "renderContext"]),
				renderRequire: new SyncWaterfallHook(["code", "renderContext"]),
				inlineInRuntimeBailout: new SyncBailHook(["module", "renderContext"]),
				embedInRuntimeBailout: new SyncBailHook(["module", "renderContext"]),
				strictRuntimeBailout: new SyncBailHook(["renderContext"]),
				chunkHash: new SyncHook(["chunk", "hash", "context"]),
				useSourceMap: new SyncBailHook(["chunk", "renderContext"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	constructor(options = {}) {
		this.options = options;
		/** @type {WeakMap<Source, TODO>} */
		this._moduleFactoryCache = new WeakMap();
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"JavascriptModulesPlugin",
			(compilation, { normalModuleFactory }) => {
				const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);
				normalModuleFactory.hooks.createParser
					.for("javascript/auto")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptParser("auto");
					});
				normalModuleFactory.hooks.createParser
					.for("javascript/dynamic")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptParser("script");
					});
				normalModuleFactory.hooks.createParser
					.for("javascript/esm")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptParser("module");
					});
				normalModuleFactory.hooks.createGenerator
					.for("javascript/auto")
					.tap("JavascriptModulesPlugin", () => {
						return new JavascriptGenerator();
					});
				normalModuleFactory.hooks.createGenerator
					.for("javascript/dynamic")
					.tap("JavascriptModulesPlugin", () => {
						return new JavascriptGenerator();
					});
				normalModuleFactory.hooks.createGenerator
					.for("javascript/esm")
					.tap("JavascriptModulesPlugin", () => {
						return new JavascriptGenerator();
					});
				compilation.hooks.renderManifest.tap(
					"JavascriptModulesPlugin",
					(result, options) => {
						const {
							hash,
							chunk,
							chunkGraph,
							moduleGraph,
							runtimeTemplate,
							dependencyTemplates,
							outputOptions,
							codeGenerationResults
						} = options;

						const hotUpdateChunk =
							chunk instanceof HotUpdateChunk ? chunk : null;

						let render;
						const filenameTemplate = JavascriptModulesPlugin.getChunkFilenameTemplate(
							chunk,
							outputOptions
						);
						if (hotUpdateChunk) {
							render = () =>
								this.renderChunk(
									{
										chunk,
										dependencyTemplates,
										runtimeTemplate,
										moduleGraph,
										chunkGraph,
										codeGenerationResults
									},
									hooks
								);
						} else if (chunk.hasRuntime()) {
							render = () =>
								this.renderMain(
									{
										hash,
										chunk,
										dependencyTemplates,
										runtimeTemplate,
										moduleGraph,
										chunkGraph,
										codeGenerationResults
									},
									hooks,
									compilation
								);
						} else {
							if (!chunkHasJs(chunk, chunkGraph)) {
								return result;
							}

							render = () =>
								this.renderChunk(
									{
										chunk,
										dependencyTemplates,
										runtimeTemplate,
										moduleGraph,
										chunkGraph,
										codeGenerationResults
									},
									hooks
								);
						}

						result.push({
							render,
							filenameTemplate,
							pathOptions: {
								hash,
								runtime: chunk.runtime,
								chunk,
								contentHashType: "javascript"
							},
							info: {
								javascriptModule: compilation.runtimeTemplate.isModule()
							},
							identifier: hotUpdateChunk
								? `hotupdatechunk${chunk.id}`
								: `chunk${chunk.id}`,
							hash: chunk.contentHash.javascript
						});

						return result;
					}
				);
				compilation.hooks.chunkHash.tap(
					"JavascriptModulesPlugin",
					(chunk, hash, context) => {
						hooks.chunkHash.call(chunk, hash, context);
						if (chunk.hasRuntime()) {
							this.updateHashWithBootstrap(
								hash,
								{
									hash: "0000",
									chunk,
									chunkGraph: context.chunkGraph,
									moduleGraph: context.moduleGraph,
									runtimeTemplate: context.runtimeTemplate
								},
								hooks
							);
						}
					}
				);
				compilation.hooks.contentHash.tap("JavascriptModulesPlugin", chunk => {
					const {
						chunkGraph,
						moduleGraph,
						runtimeTemplate,
						outputOptions: {
							hashSalt,
							hashDigest,
							hashDigestLength,
							hashFunction
						}
					} = compilation;
					const hash = createHash(hashFunction);
					if (hashSalt) hash.update(hashSalt);
					if (chunk.hasRuntime()) {
						this.updateHashWithBootstrap(
							hash,
							{
								hash: "0000",
								chunk,
								chunkGraph: compilation.chunkGraph,
								moduleGraph: compilation.moduleGraph,
								runtimeTemplate: compilation.runtimeTemplate
							},
							hooks
						);
					} else {
						hash.update(`${chunk.id} `);
						hash.update(chunk.ids ? chunk.ids.join(",") : "");
					}
					hooks.chunkHash.call(chunk, hash, {
						chunkGraph,
						moduleGraph,
						runtimeTemplate
					});
					const modules = chunkGraph.getChunkModulesIterableBySourceType(
						chunk,
						"javascript"
					);
					if (modules) {
						const xor = new StringXor();
						for (const m of modules) {
							xor.add(chunkGraph.getModuleHash(m, chunk.runtime));
						}
						xor.updateHash(hash);
					}
					const runtimeModules = chunkGraph.getChunkModulesIterableBySourceType(
						chunk,
						"runtime"
					);
					if (runtimeModules) {
						const xor = new StringXor();
						for (const m of runtimeModules) {
							xor.add(chunkGraph.getModuleHash(m, chunk.runtime));
						}
						xor.updateHash(hash);
					}
					const digest = /** @type {string} */ (hash.digest(hashDigest));
					chunk.contentHash.javascript = digest.substr(0, hashDigestLength);
				});
				compilation.hooks.additionalTreeRuntimeRequirements.tap(
					"JavascriptModulesPlugin",
					(chunk, set, { chunkGraph }) => {
						if (
							!set.has(RuntimeGlobals.startupNoDefault) &&
							chunkGraph.hasChunkEntryDependentChunks(chunk)
						) {
							set.add(RuntimeGlobals.onChunksLoaded);
							set.add(RuntimeGlobals.require);
						}
					}
				);
				compilation.hooks.executeModule.tap(
					"JavascriptModulesPlugin",
					(options, context) => {
						const source = options.codeGenerationResult.sources.get(
							"javascript"
						);
						if (source === undefined) return;
						const { module, moduleObject } = options;
						const code = source.source();

						const fn = vm.runInThisContext(
							`(function(${module.moduleArgument}, ${module.exportsArgument}, __webpack_require__) {\n${code}\n/**/})`,
							{
								filename: module.identifier(),
								lineOffset: -1
							}
						);
						try {
							fn.call(
								moduleObject.exports,
								moduleObject,
								moduleObject.exports,
								context.__webpack_require__
							);
						} catch (e) {
							e.stack += printGeneratedCodeForStack(options.module, code);
							throw e;
						}
					}
				);
				compilation.hooks.executeModule.tap(
					"JavascriptModulesPlugin",
					(options, context) => {
						const source = options.codeGenerationResult.sources.get("runtime");
						if (source === undefined) return;
						let code = source.source();
						if (typeof code !== "string") code = code.toString();

						const fn = vm.runInThisContext(
							`(function(__webpack_require__) {\n${code}\n/**/})`,
							{
								filename: options.module.identifier(),
								lineOffset: -1
							}
						);
						try {
							fn.call(null, context.__webpack_require__);
						} catch (e) {
							e.stack += printGeneratedCodeForStack(options.module, code);
							throw e;
						}
					}
				);
			}
		);
	}

	static getChunkFilenameTemplate(chunk, outputOptions) {
		if (chunk.filenameTemplate) {
			return chunk.filenameTemplate;
		} else if (chunk instanceof HotUpdateChunk) {
			return outputOptions.hotUpdateChunkFilename;
		} else if (chunk.canBeInitial()) {
			return outputOptions.filename;
		} else {
			return outputOptions.chunkFilename;
		}
	}

	/**
	 * @param {Module} module the rendered module
	 * @param {RenderContext} renderContext options object
	 * @param {CompilationHooks} hooks hooks
	 * @param {boolean | "strict"} factory true: renders as factory method, "strict": renders as factory method already in strict scope, false: pure module content
	 * @returns {Source} the newly generated source from rendering
	 */
	renderModule(module, renderContext, hooks, factory) {
		const {
			chunk,
			chunkGraph,
			runtimeTemplate,
			codeGenerationResults
		} = renderContext;
		try {
			const moduleSource = codeGenerationResults.getSource(
				module,
				chunk.runtime,
				"javascript"
			);
			if (!moduleSource) return null;
			const moduleSourcePostContent = tryRunOrWebpackError(
				() =>
					hooks.renderModuleContent.call(moduleSource, module, renderContext),
				"JavascriptModulesPlugin.getCompilationHooks().renderModuleContent"
			);
			let moduleSourcePostContainer;
			if (factory) {
				const runtimeRequirements = chunkGraph.getModuleRuntimeRequirements(
					module,
					chunk.runtime
				);
				const needModule = runtimeRequirements.has(RuntimeGlobals.module);
				const needExports = runtimeRequirements.has(RuntimeGlobals.exports);
				const needRequire =
					runtimeRequirements.has(RuntimeGlobals.require) ||
					runtimeRequirements.has(RuntimeGlobals.requireScope);
				const needThisAsExports = runtimeRequirements.has(
					RuntimeGlobals.thisAsExports
				);
				const needStrict = module.buildInfo.strict && factory !== "strict";
				const cacheEntry = this._moduleFactoryCache.get(
					moduleSourcePostContent
				);
				let source;
				if (
					cacheEntry &&
					cacheEntry.needModule === needModule &&
					cacheEntry.needExports === needExports &&
					cacheEntry.needRequire === needRequire &&
					cacheEntry.needThisAsExports === needThisAsExports &&
					cacheEntry.needStrict === needStrict
				) {
					source = cacheEntry.source;
				} else {
					const factorySource = new ConcatSource();
					const args = [];
					if (needExports || needRequire || needModule)
						args.push(
							needModule
								? module.moduleArgument
								: "__unused_webpack_" + module.moduleArgument
						);
					if (needExports || needRequire)
						args.push(
							needExports
								? module.exportsArgument
								: "__unused_webpack_" + module.exportsArgument
						);
					if (needRequire) args.push("__webpack_require__");
					if (!needThisAsExports && runtimeTemplate.supportsArrowFunction()) {
						factorySource.add("/***/ ((" + args.join(", ") + ") => {\n\n");
					} else {
						factorySource.add("/***/ (function(" + args.join(", ") + ") {\n\n");
					}
					if (needStrict) {
						factorySource.add('"use strict";\n');
					}
					factorySource.add(moduleSourcePostContent);
					factorySource.add("\n\n/***/ })");
					source = new CachedSource(factorySource);
					this._moduleFactoryCache.set(moduleSourcePostContent, {
						source,
						needModule,
						needExports,
						needRequire,
						needThisAsExports,
						needStrict
					});
				}
				moduleSourcePostContainer = tryRunOrWebpackError(
					() => hooks.renderModuleContainer.call(source, module, renderContext),
					"JavascriptModulesPlugin.getCompilationHooks().renderModuleContainer"
				);
			} else {
				moduleSourcePostContainer = moduleSourcePostContent;
			}
			return tryRunOrWebpackError(
				() =>
					hooks.renderModulePackage.call(
						moduleSourcePostContainer,
						module,
						renderContext
					),
				"JavascriptModulesPlugin.getCompilationHooks().renderModulePackage"
			);
		} catch (e) {
			e.module = module;
			throw e;
		}
	}

	/**
	 * @param {RenderContext} renderContext the render context
	 * @param {CompilationHooks} hooks hooks
	 * @returns {Source} the rendered source
	 */
	renderChunk(renderContext, hooks) {
		const { chunk, chunkGraph } = renderContext;
		const modules = chunkGraph.getOrderedChunkModulesIterableBySourceType(
			chunk,
			"javascript",
			compareModulesByIdentifier
		);
		const moduleSources =
			Template.renderChunkModules(
				renderContext,
				modules ? Array.from(modules) : [],
				module => this.renderModule(module, renderContext, hooks, true)
			) || new RawSource("{}");
		let source = tryRunOrWebpackError(
			() => hooks.renderChunk.call(moduleSources, renderContext),
			"JavascriptModulesPlugin.getCompilationHooks().renderChunk"
		);
		source = tryRunOrWebpackError(
			() => hooks.render.call(source, renderContext),
			"JavascriptModulesPlugin.getCompilationHooks().render"
		);
		chunk.rendered = true;
		return new ConcatSource(source, ";");
	}

	/**
	 * @param {MainRenderContext} renderContext options object
	 * @param {CompilationHooks} hooks hooks
	 * @param {Compilation} compilation the compilation
	 * @returns {Source} the newly generated source from rendering
	 */
	renderMain(renderContext, hooks, compilation) {
		const { chunk, chunkGraph, runtimeTemplate } = renderContext;

		const runtimeRequirements = chunkGraph.getTreeRuntimeRequirements(chunk);
		const iife = runtimeTemplate.isIIFE();

		const bootstrap = this.renderBootstrap(renderContext, hooks);
		const useSourceMap = hooks.useSourceMap.call(chunk, renderContext);

		const allModules = Array.from(
			chunkGraph.getOrderedChunkModulesIterableBySourceType(
				chunk,
				"javascript",
				compareModulesByIdentifier
			) || []
		);

		const hasEntryModules = chunkGraph.getNumberOfEntryModules(chunk) > 0;
		let inlinedModules;
		if (bootstrap.allowInlineStartup && hasEntryModules) {
			inlinedModules = new Set(chunkGraph.getChunkEntryModulesIterable(chunk));
		}

		let source = new ConcatSource();
		let prefix;
		if (iife) {
			if (runtimeTemplate.supportsArrowFunction()) {
				source.add("/******/ (() => { // webpackBootstrap\n");
			} else {
				source.add("/******/ (function() { // webpackBootstrap\n");
			}
			prefix = "/******/ \t";
		} else {
			prefix = "/******/ ";
		}
		let allStrict = false;
		if (allModules.every(m => m.buildInfo.strict)) {
			const strictBailout = hooks.strictRuntimeBailout.call(renderContext);
			if (strictBailout) {
				source.add(
					prefix +
						`// runtime can't be in strict mode because ${strictBailout}.\n`
				);
			} else {
				allStrict = true;
				source.add(prefix + '"use strict";\n');
			}
		}

		const chunkModules = Template.renderChunkModules(
			renderContext,
			inlinedModules
				? allModules.filter(m => !inlinedModules.has(m))
				: allModules,
			module =>
				this.renderModule(
					module,
					renderContext,
					hooks,
					allStrict ? "strict" : true
				),
			prefix
		);
		if (
			chunkModules ||
			runtimeRequirements.has(RuntimeGlobals.moduleFactories) ||
			runtimeRequirements.has(RuntimeGlobals.moduleFactoriesAddOnly)
		) {
			source.add(prefix + "var __webpack_modules__ = (");
			source.add(chunkModules || "{}");
			source.add(");\n");
			source.add(
				"/************************************************************************/\n"
			);
		}

		if (bootstrap.header.length > 0) {
			const header = Template.asString(bootstrap.header) + "\n";
			source.add(
				new PrefixSource(
					prefix,
					useSourceMap
						? new OriginalSource(header, "webpack/bootstrap")
						: new RawSource(header)
				)
			);
			source.add(
				"/************************************************************************/\n"
			);
		}

		const runtimeModules = renderContext.chunkGraph.getChunkRuntimeModulesInOrder(
			chunk
		);

		if (runtimeModules.length > 0) {
			source.add(
				new PrefixSource(
					prefix,
					Template.renderRuntimeModules(runtimeModules, renderContext)
				)
			);
			source.add(
				"/************************************************************************/\n"
			);
			// runtimeRuntimeModules calls codeGeneration
			for (const module of runtimeModules) {
				compilation.codeGeneratedModules.add(module);
			}
		}
		if (inlinedModules) {
			if (bootstrap.beforeStartup.length > 0) {
				const beforeStartup = Template.asString(bootstrap.beforeStartup) + "\n";
				source.add(
					new PrefixSource(
						prefix,
						useSourceMap
							? new OriginalSource(beforeStartup, "webpack/before-startup")
							: new RawSource(beforeStartup)
					)
				);
			}
			const lastInlinedModule = last(inlinedModules);
			const startupSource = new ConcatSource();
			startupSource.add(`var __webpack_exports__ = {};\n`);
			for (const m of inlinedModules) {
				const renderedModule = this.renderModule(
					m,
					renderContext,
					hooks,
					false
				);
				if (renderedModule) {
					const innerStrict = !allStrict && m.buildInfo.strict;
					const runtimeRequirements = chunkGraph.getModuleRuntimeRequirements(
						m,
						chunk.runtime
					);
					const exports = runtimeRequirements.has(RuntimeGlobals.exports);
					const webpackExports =
						exports && m.exportsArgument === "__webpack_exports__";
					let iife = innerStrict
						? "it need to be in strict mode."
						: inlinedModules.size > 1
						? // TODO check globals and top-level declarations of other entries and chunk modules
						  // to make a better decision
						  "it need to be isolated against other entry modules."
						: chunkModules
						? "it need to be isolated against other modules in the chunk."
						: exports && !webpackExports
						? `it uses a non-standard name for the exports (${m.exportsArgument}).`
						: hooks.embedInRuntimeBailout.call(m, renderContext);
					let footer;
					if (iife !== undefined) {
						startupSource.add(
							`// This entry need to be wrapped in an IIFE because ${iife}\n`
						);
						const arrow = runtimeTemplate.supportsArrowFunction();
						if (arrow) {
							startupSource.add("(() => {\n");
							footer = "\n})();\n\n";
						} else {
							startupSource.add("!function() {\n");
							footer = "\n}();\n";
						}
						if (innerStrict) startupSource.add('"use strict";\n');
					} else {
						footer = "\n";
					}
					if (exports) {
						if (m !== lastInlinedModule)
							startupSource.add(`var ${m.exportsArgument} = {};\n`);
						else if (m.exportsArgument !== "__webpack_exports__")
							startupSource.add(
								`var ${m.exportsArgument} = __webpack_exports__;\n`
							);
					}
					startupSource.add(renderedModule);
					startupSource.add(footer);
				}
			}
			if (runtimeRequirements.has(RuntimeGlobals.onChunksLoaded)) {
				startupSource.add(`${RuntimeGlobals.onChunksLoaded}();\n`);
			}
			source.add(
				hooks.renderStartup.call(startupSource, lastInlinedModule, {
					...renderContext,
					inlined: true
				})
			);
			if (bootstrap.afterStartup.length > 0) {
				const afterStartup = Template.asString(bootstrap.afterStartup) + "\n";
				source.add(
					new PrefixSource(
						prefix,
						useSourceMap
							? new OriginalSource(afterStartup, "webpack/after-startup")
							: new RawSource(afterStartup)
					)
				);
			}
		} else {
			const lastEntryModule = last(
				chunkGraph.getChunkEntryModulesIterable(chunk)
			);
			const toSource = useSourceMap
				? (content, name) =>
						new OriginalSource(Template.asString(content), name)
				: content => new RawSource(Template.asString(content));
			source.add(
				new PrefixSource(
					prefix,
					new ConcatSource(
						toSource(bootstrap.beforeStartup, "webpack/before-startup"),
						"\n",
						hooks.renderStartup.call(
							toSource(bootstrap.startup.concat(""), "webpack/startup"),
							lastEntryModule,
							{
								...renderContext,
								inlined: false
							}
						),
						toSource(bootstrap.afterStartup, "webpack/after-startup"),
						"\n"
					)
				)
			);
		}
		if (
			hasEntryModules &&
			runtimeRequirements.has(RuntimeGlobals.returnExportsFromRuntime)
		) {
			source.add(`${prefix}return __webpack_exports__;\n`);
		}
		if (iife) {
			source.add("/******/ })()\n");
		}

		/** @type {Source} */
		let finalSource = tryRunOrWebpackError(
			() => hooks.renderMain.call(source, renderContext),
			"JavascriptModulesPlugin.getCompilationHooks().renderMain"
		);
		if (!finalSource) {
			throw new Error(
				"JavascriptModulesPlugin error: JavascriptModulesPlugin.getCompilationHooks().renderMain plugins should return something"
			);
		}
		finalSource = tryRunOrWebpackError(
			() => hooks.render.call(finalSource, renderContext),
			"JavascriptModulesPlugin.getCompilationHooks().render"
		);
		if (!finalSource) {
			throw new Error(
				"JavascriptModulesPlugin error: JavascriptModulesPlugin.getCompilationHooks().render plugins should return something"
			);
		}
		chunk.rendered = true;
		return iife ? new ConcatSource(finalSource, ";") : finalSource;
	}

	/**
	 * @param {Hash} hash the hash to be updated
	 * @param {RenderBootstrapContext} renderContext options object
	 * @param {CompilationHooks} hooks hooks
	 */
	updateHashWithBootstrap(hash, renderContext, hooks) {
		const bootstrap = this.renderBootstrap(renderContext, hooks);
		for (const key of Object.keys(bootstrap)) {
			hash.update(key);
			if (Array.isArray(bootstrap[key])) {
				for (const line of bootstrap[key]) {
					hash.update(line);
				}
			} else {
				hash.update(JSON.stringify(bootstrap[key]));
			}
		}
	}

	/**
	 * @param {RenderBootstrapContext} renderContext options object
	 * @param {CompilationHooks} hooks hooks
	 * @returns {{ header: string[], beforeStartup: string[], startup: string[], afterStartup: string[], allowInlineStartup: boolean }} the generated source of the bootstrap code
	 */
	renderBootstrap(renderContext, hooks) {
		const { chunkGraph, moduleGraph, chunk, runtimeTemplate } = renderContext;

		const runtimeRequirements = chunkGraph.getTreeRuntimeRequirements(chunk);

		const requireFunction = runtimeRequirements.has(RuntimeGlobals.require);
		const moduleCache = runtimeRequirements.has(RuntimeGlobals.moduleCache);
		const moduleFactories = runtimeRequirements.has(
			RuntimeGlobals.moduleFactories
		);
		const moduleUsed = runtimeRequirements.has(RuntimeGlobals.module);
		const requireScopeUsed = runtimeRequirements.has(
			RuntimeGlobals.requireScope
		);
		const interceptModuleExecution = runtimeRequirements.has(
			RuntimeGlobals.interceptModuleExecution
		);

		const useRequire =
			requireFunction || interceptModuleExecution || moduleUsed;

		const result = {
			header: [],
			beforeStartup: [],
			startup: [],
			afterStartup: [],
			allowInlineStartup: true
		};

		let { header: buf, startup, beforeStartup, afterStartup } = result;

		if (result.allowInlineStartup && moduleFactories) {
			startup.push(
				"// module factories are used so entry inlining is disabled"
			);
			result.allowInlineStartup = false;
		}
		if (result.allowInlineStartup && moduleCache) {
			startup.push("// module cache are used so entry inlining is disabled");
			result.allowInlineStartup = false;
		}
		if (result.allowInlineStartup && interceptModuleExecution) {
			startup.push(
				"// module execution is intercepted so entry inlining is disabled"
			);
			result.allowInlineStartup = false;
		}

		if (useRequire || moduleCache) {
			buf.push("// The module cache");
			buf.push("var __webpack_module_cache__ = {};");
			buf.push("");
		}

		if (useRequire) {
			buf.push("// The require function");
			buf.push(`function __webpack_require__(moduleId) {`);
			buf.push(Template.indent(this.renderRequire(renderContext, hooks)));
			buf.push("}");
			buf.push("");
		} else if (runtimeRequirements.has(RuntimeGlobals.requireScope)) {
			buf.push("// The require scope");
			buf.push("var __webpack_require__ = {};");
			buf.push("");
		}

		if (
			moduleFactories ||
			runtimeRequirements.has(RuntimeGlobals.moduleFactoriesAddOnly)
		) {
			buf.push("// expose the modules object (__webpack_modules__)");
			buf.push(`${RuntimeGlobals.moduleFactories} = __webpack_modules__;`);
			buf.push("");
		}

		if (moduleCache) {
			buf.push("// expose the module cache");
			buf.push(`${RuntimeGlobals.moduleCache} = __webpack_module_cache__;`);
			buf.push("");
		}

		if (interceptModuleExecution) {
			buf.push("// expose the module execution interceptor");
			buf.push(`${RuntimeGlobals.interceptModuleExecution} = [];`);
			buf.push("");
		}

		if (!runtimeRequirements.has(RuntimeGlobals.startupNoDefault)) {
			if (chunkGraph.getNumberOfEntryModules(chunk) > 0) {
				/** @type {string[]} */
				const buf2 = [];
				const runtimeRequirements = chunkGraph.getTreeRuntimeRequirements(
					chunk
				);
				buf2.push("// Load entry module and return exports");
				let i = chunkGraph.getNumberOfEntryModules(chunk);
				for (const [
					entryModule,
					entrypoint
				] of chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)) {
					const chunks = entrypoint.chunks.filter(c => c !== chunk);
					if (result.allowInlineStartup && chunks.length > 0) {
						buf2.push(
							"// This entry module depends on other loaded chunks and execution need to be delayed"
						);
						result.allowInlineStartup = false;
					}
					if (
						result.allowInlineStartup &&
						someInIterable(
							moduleGraph.getIncomingConnectionsByOriginModule(entryModule),
							([originModule, connections]) =>
								originModule &&
								connections.some(c => c.isTargetActive(chunk.runtime)) &&
								someInIterable(
									chunkGraph.getModuleRuntimes(originModule),
									runtime =>
										intersectRuntime(runtime, chunk.runtime) !== undefined
								)
						)
					) {
						buf2.push(
							"// This entry module is referenced by other modules so it can't be inlined"
						);
						result.allowInlineStartup = false;
					}
					if (
						result.allowInlineStartup &&
						(!entryModule.buildInfo ||
							!entryModule.buildInfo.topLevelDeclarations)
					) {
						buf2.push(
							"// This entry module doesn't tell about it's top-level declarations so it can't be inlined"
						);
						result.allowInlineStartup = false;
					}
					if (result.allowInlineStartup) {
						const bailout = hooks.inlineInRuntimeBailout.call(
							entryModule,
							renderContext
						);
						if (bailout !== undefined) {
							buf2.push(
								`// This entry module can't be inlined because ${bailout}`
							);
							result.allowInlineStartup = false;
						}
					}
					i--;
					const moduleId = chunkGraph.getModuleId(entryModule);
					const entryRuntimeRequirements = chunkGraph.getModuleRuntimeRequirements(
						entryModule,
						chunk.runtime
					);
					let moduleIdExpr = JSON.stringify(moduleId);
					if (runtimeRequirements.has(RuntimeGlobals.entryModuleId)) {
						moduleIdExpr = `${RuntimeGlobals.entryModuleId} = ${moduleIdExpr}`;
					}
					if (
						result.allowInlineStartup &&
						entryRuntimeRequirements.has(RuntimeGlobals.module)
					) {
						result.allowInlineStartup = false;
						buf2.push(
							"// This entry module used 'module' so it can't be inlined"
						);
					}
					if (chunks.length > 0) {
						buf2.push(
							`${i === 0 ? "var __webpack_exports__ = " : ""}${
								RuntimeGlobals.onChunksLoaded
							}(undefined, ${JSON.stringify(
								chunks.map(c => c.id)
							)}, ${runtimeTemplate.returningFunction(
								`__webpack_require__(${moduleIdExpr})`
							)})`
						);
					} else if (useRequire) {
						buf2.push(
							`${
								i === 0 ? "var __webpack_exports__ = " : ""
							}__webpack_require__(${moduleIdExpr});`
						);
					} else {
						if (i === 0) buf2.push("var __webpack_exports__ = {};");
						if (requireScopeUsed) {
							buf2.push(
								`__webpack_modules__[${moduleIdExpr}](0, ${
									i === 0 ? "__webpack_exports__" : "{}"
								}, __webpack_require__);`
							);
						} else if (entryRuntimeRequirements.has(RuntimeGlobals.exports)) {
							buf2.push(
								`__webpack_modules__[${moduleIdExpr}](0, ${
									i === 0 ? "__webpack_exports__" : "{}"
								});`
							);
						} else {
							buf2.push(`__webpack_modules__[${moduleIdExpr}]();`);
						}
					}
				}
				if (runtimeRequirements.has(RuntimeGlobals.onChunksLoaded)) {
					buf2.push(
						`__webpack_exports__ = ${RuntimeGlobals.onChunksLoaded}(__webpack_exports__);`
					);
				}
				if (
					runtimeRequirements.has(RuntimeGlobals.startup) ||
					(runtimeRequirements.has(RuntimeGlobals.startupOnlyBefore) &&
						runtimeRequirements.has(RuntimeGlobals.startupOnlyAfter))
				) {
					result.allowInlineStartup = false;
					buf.push("// the startup function");
					buf.push(
						`${RuntimeGlobals.startup} = ${runtimeTemplate.basicFunction("", [
							...buf2,
							"return __webpack_exports__;"
						])};`
					);
					buf.push("");
					startup.push("// run startup");
					startup.push(
						`var __webpack_exports__ = ${RuntimeGlobals.startup}();`
					);
				} else if (runtimeRequirements.has(RuntimeGlobals.startupOnlyBefore)) {
					buf.push("// the startup function");
					buf.push(
						`${RuntimeGlobals.startup} = ${runtimeTemplate.emptyFunction()};`
					);
					beforeStartup.push("// run runtime startup");
					beforeStartup.push(`${RuntimeGlobals.startup}();`);
					startup.push("// startup");
					startup.push(Template.asString(buf2));
				} else if (runtimeRequirements.has(RuntimeGlobals.startupOnlyAfter)) {
					buf.push("// the startup function");
					buf.push(
						`${RuntimeGlobals.startup} = ${runtimeTemplate.emptyFunction()};`
					);
					startup.push("// startup");
					startup.push(Template.asString(buf2));
					afterStartup.push("// run runtime startup");
					afterStartup.push(`${RuntimeGlobals.startup}();`);
				} else {
					startup.push("// startup");
					startup.push(Template.asString(buf2));
				}
			} else if (
				runtimeRequirements.has(RuntimeGlobals.startup) ||
				runtimeRequirements.has(RuntimeGlobals.startupOnlyBefore) ||
				runtimeRequirements.has(RuntimeGlobals.startupOnlyAfter)
			) {
				buf.push(
					"// the startup function",
					"// It's empty as no entry modules are in this chunk",
					`${RuntimeGlobals.startup} = ${runtimeTemplate.emptyFunction()};`,
					""
				);
			}
		} else if (
			runtimeRequirements.has(RuntimeGlobals.startup) ||
			runtimeRequirements.has(RuntimeGlobals.startupOnlyBefore) ||
			runtimeRequirements.has(RuntimeGlobals.startupOnlyAfter)
		) {
			result.allowInlineStartup = false;
			buf.push(
				"// the startup function",
				"// It's empty as some runtime module handles the default behavior",
				`${RuntimeGlobals.startup} = ${runtimeTemplate.emptyFunction()};`
			);
			startup.push("// run startup");
			startup.push(`var __webpack_exports__ = ${RuntimeGlobals.startup}();`);
		}
		return result;
	}

	/**
	 * @param {RenderBootstrapContext} renderContext options object
	 * @param {CompilationHooks} hooks hooks
	 * @returns {string} the generated source of the require function
	 */
	renderRequire(renderContext, hooks) {
		const {
			chunk,
			chunkGraph,
			runtimeTemplate: { outputOptions }
		} = renderContext;
		const runtimeRequirements = chunkGraph.getTreeRuntimeRequirements(chunk);
		const moduleExecution = runtimeRequirements.has(
			RuntimeGlobals.interceptModuleExecution
		)
			? Template.asString([
					"var execOptions = { id: moduleId, module: module, factory: __webpack_modules__[moduleId], require: __webpack_require__ };",
					`${RuntimeGlobals.interceptModuleExecution}.forEach(function(handler) { handler(execOptions); });`,
					"module = execOptions.module;",
					"execOptions.factory.call(module.exports, module, module.exports, execOptions.require);"
			  ])
			: runtimeRequirements.has(RuntimeGlobals.thisAsExports)
			? Template.asString([
					"__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);"
			  ])
			: Template.asString([
					"__webpack_modules__[moduleId](module, module.exports, __webpack_require__);"
			  ]);
		const needModuleId = runtimeRequirements.has(RuntimeGlobals.moduleId);
		const needModuleLoaded = runtimeRequirements.has(
			RuntimeGlobals.moduleLoaded
		);
		const content = Template.asString([
			"// Check if module is in cache",
			"var cachedModule = __webpack_module_cache__[moduleId];",
			"if (cachedModule !== undefined) {",
			outputOptions.strictModuleErrorHandling
				? Template.indent([
						"if (cachedModule.error !== undefined) throw cachedModule.error;",
						"return cachedModule.exports;"
				  ])
				: Template.indent("return cachedModule.exports;"),
			"}",
			"// Create a new module (and put it into the cache)",
			"var module = __webpack_module_cache__[moduleId] = {",
			Template.indent([
				needModuleId ? "id: moduleId," : "// no module.id needed",
				needModuleLoaded ? "loaded: false," : "// no module.loaded needed",
				"exports: {}"
			]),
			"};",
			"",
			outputOptions.strictModuleExceptionHandling
				? Template.asString([
						"// Execute the module function",
						"var threw = true;",
						"try {",
						Template.indent([moduleExecution, "threw = false;"]),
						"} finally {",
						Template.indent([
							"if(threw) delete __webpack_module_cache__[moduleId];"
						]),
						"}"
				  ])
				: outputOptions.strictModuleErrorHandling
				? Template.asString([
						"// Execute the module function",
						"try {",
						Template.indent(moduleExecution),
						"} catch(e) {",
						Template.indent(["module.error = e;", "throw e;"]),
						"}"
				  ])
				: Template.asString([
						"// Execute the module function",
						moduleExecution
				  ]),
			needModuleLoaded
				? Template.asString([
						"",
						"// Flag the module as loaded",
						"module.loaded = true;",
						""
				  ])
				: "",
			"// Return the exports of the module",
			"return module.exports;"
		]);
		return tryRunOrWebpackError(
			() => hooks.renderRequire.call(content, renderContext),
			"JavascriptModulesPlugin.getCompilationHooks().renderRequire"
		);
	}
}

module.exports = JavascriptModulesPlugin;
module.exports.chunkHasJs = chunkHasJs;
