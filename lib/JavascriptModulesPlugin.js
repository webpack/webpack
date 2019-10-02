/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook, SyncHook } = require("tapable");
const {
	ConcatSource,
	OriginalSource,
	PrefixSource
} = require("webpack-sources");
const Compilation = require("./Compilation");
const { tryRunOrWebpackError } = require("./HookWebpackError");
const HotUpdateChunk = require("./HotUpdateChunk");
const JavascriptGenerator = require("./JavascriptGenerator");
const JavascriptParser = require("./JavascriptParser");
const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");
const { compareModulesByIdOrIdentifier } = require("./util/comparators");
const createHash = require("./util/createHash");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./ChunkTemplate")} ChunkTemplate */
/** @typedef {import("./Compilation").ChunkHashContext} ChunkHashContext */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./util/Hash")} Hash */

/**
 * @param {Chunk} chunk a chunk
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @returns {boolean} true, when a JS file is needed for this chunk
 */
const chunkHasJs = (chunk, chunkGraph) => {
	if (chunkGraph.getNumberOfEntryModules(chunk) > 0) return true;

	for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
		if (module.getSourceTypes().has("javascript")) {
			return true;
		}
	}
	return false;
};

/**
 * @typedef {Object} RenderContext
 * @property {Chunk} chunk the chunk
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 */

/**
 * @typedef {Object} MainRenderContext
 * @property {Chunk} chunk the chunk
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
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

/**
 * @typedef {Object} CompilationHooks
 * @property {SyncWaterfallHook<[Source, Module, RenderContext]>} renderModuleContent
 * @property {SyncWaterfallHook<[Source, Module, RenderContext]>} renderModuleContainer
 * @property {SyncWaterfallHook<[Source, Module, RenderContext]>} renderModulePackage
 * @property {SyncWaterfallHook<[Source, RenderContext]>} renderChunk
 * @property {SyncWaterfallHook<[Source, RenderContext]>} renderMain
 * @property {SyncWaterfallHook<[Source, RenderContext]>} renderWithEntry
 * @property {SyncWaterfallHook<[string, RenderBootstrapContext]>} renderRequire
 * @property {SyncHook<[Chunk, Hash, ChunkHashContext]>} chunkHash
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
				"The 'compilation' argument must be an instance of JavascriptParser"
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
				renderWithEntry: new SyncWaterfallHook(["source", "renderContext"]),
				renderChunk: new SyncWaterfallHook(["source", "renderContext"]),
				renderMain: new SyncWaterfallHook(["source", "renderContext"]),
				renderRequire: new SyncWaterfallHook(["code", "renderContext"]),
				chunkHash: new SyncHook(["chunk", "hash", "context"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"JavascriptModulesPlugin",
			(compilation, { normalModuleFactory }) => {
				const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);
				const moduleGraph = compilation.moduleGraph;
				normalModuleFactory.hooks.createParser
					.for("javascript/auto")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptParser(options, "auto");
					});
				normalModuleFactory.hooks.createParser
					.for("javascript/dynamic")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptParser(options, "script");
					});
				normalModuleFactory.hooks.createParser
					.for("javascript/esm")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptParser(options, "module");
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
				compilation.mainTemplate.hooks.renderManifest.tap(
					"JavascriptModulesPlugin",
					(result, options) => {
						const chunk = options.chunk;
						const hash = options.hash;
						const outputOptions = options.outputOptions;
						const dependencyTemplates = options.dependencyTemplates;

						const filenameTemplate =
							chunk.filenameTemplate || outputOptions.filename;

						result.push({
							render: () =>
								this.renderMain(
									{
										hash,
										chunk,
										dependencyTemplates,
										runtimeTemplate: options.runtimeTemplate,
										moduleGraph: options.moduleGraph,
										chunkGraph: options.chunkGraph
									},
									hooks
								),
							filenameTemplate,
							pathOptions: {
								chunk,
								contentHashType: "javascript"
							},
							identifier: `chunk${chunk.id}`,
							hash: chunk.hash
						});
						return result;
					}
				);
				compilation.chunkTemplate.hooks.renderManifest.tap(
					"JavascriptModulesPlugin",
					(result, options) => {
						const chunk = options.chunk;
						const chunkGraph = options.chunkGraph;
						const hotUpdateChunk =
							chunk instanceof HotUpdateChunk ? chunk : null;
						const outputOptions = options.outputOptions;
						const dependencyTemplates = options.dependencyTemplates;

						if (!hotUpdateChunk && !chunkHasJs(chunk, chunkGraph)) {
							return result;
						}

						let filenameTemplate;
						if (hotUpdateChunk) {
							filenameTemplate = outputOptions.hotUpdateChunkFilename;
						} else if (chunk.filenameTemplate) {
							filenameTemplate = chunk.filenameTemplate;
						} else if (chunk.isOnlyInitial()) {
							filenameTemplate = outputOptions.filename;
						} else {
							filenameTemplate = outputOptions.chunkFilename;
						}

						result.push({
							render: () =>
								this.renderChunk(
									compilation,
									compilation.chunkTemplate,
									{
										chunk,
										dependencyTemplates,
										runtimeTemplate: compilation.runtimeTemplate,
										moduleGraph,
										chunkGraph: compilation.chunkGraph
									},
									hooks
								),
							filenameTemplate,
							pathOptions: {
								hash: options.hash,
								chunk,
								contentHashType: "javascript"
							},
							identifier: `chunk${chunk.id}`,
							hash: chunk.hash
						});

						return result;
					}
				);
				compilation.hooks.chunkHash.tap(
					"JavascriptModulesPlugin",
					(chunk, hash, context) => {
						hooks.chunkHash.call(chunk, hash, context);
						if (chunk.hasRuntime()) {
							const bootstrap = this.renderBootstrap(
								{
									hash: "0000",
									chunk,
									chunkGraph: context.chunkGraph,
									moduleGraph: context.moduleGraph,
									runtimeTemplate: context.runtimeTemplate
								},
								hooks
							);
							for (const key of Object.keys(bootstrap)) {
								hash.update(key);
								for (const line of bootstrap[key]) {
									hash.update(line);
								}
							}
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
					const hotUpdateChunk = chunk instanceof HotUpdateChunk ? chunk : null;
					const hash = createHash(hashFunction);
					if (hashSalt) hash.update(hashSalt);
					hash.update(`${chunk.id} `);
					hash.update(chunk.ids ? chunk.ids.join(",") : "");
					hooks.chunkHash.call(chunk, hash, {
						chunkGraph,
						moduleGraph,
						runtimeTemplate
					});
					for (const m of chunkGraph.getOrderedChunkModulesIterable(
						chunk,
						compareModulesByIdOrIdentifier(chunkGraph)
					)) {
						if (m.getSourceTypes().has("javascript")) {
							hash.update(chunkGraph.getModuleHash(m));
						}
					}
					if (hotUpdateChunk) {
						hash.update(JSON.stringify(hotUpdateChunk.removedModules));
					}
					const digest = /** @type {string} */ (hash.digest(hashDigest));
					chunk.contentHash.javascript = digest.substr(0, hashDigestLength);
				});
			}
		);
	}

	/**
	 * @param {Module} module the rendered module
	 * @param {RenderContext} renderContext options object
	 * @param {CompilationHooks} hooks hooks
	 * @returns {Source} the newly generated source from rendering
	 */
	renderModule(module, renderContext, hooks) {
		const {
			chunkGraph,
			moduleGraph,
			runtimeTemplate,
			dependencyTemplates
		} = renderContext;
		try {
			const moduleSource = module.source({
				dependencyTemplates,
				runtimeTemplate,
				moduleGraph,
				chunkGraph,
				type: "javascript"
			});
			const moduleSourcePostContent = tryRunOrWebpackError(
				() =>
					hooks.renderModuleContent.call(moduleSource, module, renderContext),
				"JavascriptModulesPlugin.getCompilationHooks().renderModuleContent"
			);
			const source = new ConcatSource();
			const args = [];
			const runtimeRequirements = chunkGraph.getModuleRuntimeRequirements(
				module
			);
			const needModule = runtimeRequirements.has(RuntimeGlobals.module);
			const needExports = runtimeRequirements.has(RuntimeGlobals.exports);
			const needRequire =
				runtimeRequirements.has(RuntimeGlobals.require) ||
				runtimeRequirements.has(RuntimeGlobals.requireScope);
			const needThisAsExports = runtimeRequirements.has(
				RuntimeGlobals.thisAsExports
			);
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
				source.add("/***/ ((" + args.join(", ") + ") => {\n\n");
			} else {
				source.add("/***/ (function(" + args.join(", ") + ") {\n\n");
			}
			if (module.buildInfo.strict) source.add('"use strict";\n');
			source.add(moduleSourcePostContent);
			source.add("\n\n/***/ })");
			const moduleSourcePostContainer = tryRunOrWebpackError(
				() => hooks.renderModuleContainer.call(source, module, renderContext),
				"JavascriptModulesPlugin.getCompilationHooks().renderModuleContainer"
			);
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
	 * @param {Compilation} compilation the compilation
	 * @param {ChunkTemplate} chunkTemplate the chunk template
	 * @param {RenderContext} renderContext the render context
	 * @param {CompilationHooks} hooks hooks
	 * @returns {Source} the rendered source
	 */
	renderChunk(compilation, chunkTemplate, renderContext, hooks) {
		const chunk = renderContext.chunk;
		const moduleSources = Template.renderChunkModules(
			renderContext,
			m => m.getSourceTypes().has("javascript"),
			module => this.renderModule(module, renderContext, hooks)
		);
		let source = tryRunOrWebpackError(
			() => hooks.renderChunk.call(moduleSources, renderContext),
			"JavascriptModulesPlugin.getCompilationHooks().renderChunk"
		);
		if (renderContext.chunkGraph.getNumberOfEntryModules(chunk) > 0) {
			source = tryRunOrWebpackError(
				() => hooks.renderWithEntry.call(source, renderContext),
				"JavascriptModulesPlugin.getCompilationHooks().renderWithEntry"
			);
		}
		chunk.rendered = true;
		return new ConcatSource(source, ";");
	}

	/**
	 * @param {MainRenderContext} renderContext options object
	 * @param {CompilationHooks} hooks hooks
	 * @returns {Source} the newly generated source from rendering
	 */
	renderMain(renderContext, hooks) {
		const { chunk, chunkGraph, runtimeTemplate } = renderContext;

		let source = new ConcatSource();
		if (runtimeTemplate.supportsConst()) {
			source.add("/******/ (() => { // webpackBootstrap\n");
		} else {
			source.add("/******/ (function() { // webpackBootstrap\n");
		}

		source.add("/******/ \tvar __webpack_modules__ = (");
		source.add(
			Template.renderChunkModules(
				renderContext,
				m => m.getSourceTypes().has("javascript"),
				module => this.renderModule(module, renderContext, hooks),
				"/******/ \t"
			)
		);
		source.add(");\n");

		const bootstrap = this.renderBootstrap(renderContext, hooks);

		source.add(
			"/************************************************************************/\n"
		);
		source.add(
			new PrefixSource(
				"/******/",
				new OriginalSource(
					Template.prefix(bootstrap.header, " \t") + "\n",
					"webpack/bootstrap"
				)
			)
		);

		const runtimeModules = renderContext.chunkGraph.getChunkRuntimeModulesInOrder(
			chunk
		);

		if (runtimeModules.length > 0) {
			source.add(
				"/************************************************************************/\n"
			);
			source.add(
				Template.renderMainRuntimeModules(runtimeModules, renderContext)
			);
		}
		source.add(
			"/************************************************************************/\n"
		);
		source.add(
			new PrefixSource(
				"/******/",
				new OriginalSource(
					Template.prefix(bootstrap.startup, " \t") + "\n",
					"webpack/startup"
				)
			)
		);
		source.add("/******/ })()\n");

		/** @type {Source} */
		let finalSource = tryRunOrWebpackError(
			() => hooks.renderMain.call(source, renderContext),
			"JavascriptModulesPlugin.getCompilationHooks().renderMain"
		);
		if (chunkGraph.getNumberOfEntryModules(chunk) > 0) {
			finalSource = tryRunOrWebpackError(
				() => hooks.renderWithEntry.call(finalSource, renderContext),
				"JavascriptModulesPlugin.getCompilationHooks().renderWithEntry"
			);
		}
		if (!finalSource) {
			throw new Error(
				"Compiler error: MainTemplate plugin 'render' should return something"
			);
		}
		chunk.rendered = true;
		return new ConcatSource(finalSource, ";");
	}

	/**
	 * @param {RenderBootstrapContext} renderContext options object
	 * @param {CompilationHooks} hooks hooks
	 * @returns {{ header: string[], startup: string[] }} the generated source of the bootstrap code
	 */
	renderBootstrap(renderContext, hooks) {
		const { chunkGraph, chunk, runtimeTemplate } = renderContext;

		const runtimeRequirements = chunkGraph.getTreeRuntimeRequirements(chunk);

		const requireFunction = runtimeRequirements.has(RuntimeGlobals.require);
		const moduleCache = runtimeRequirements.has(RuntimeGlobals.moduleCache);
		const moduleUsed = runtimeRequirements.has(RuntimeGlobals.module);
		const exportsUsed = runtimeRequirements.has(RuntimeGlobals.exports);
		const requireScopeUsed = runtimeRequirements.has(
			RuntimeGlobals.requireScope
		);
		const interceptModuleExecution = runtimeRequirements.has(
			RuntimeGlobals.interceptModuleExecution
		);
		const returnExportsFromRuntime = runtimeRequirements.has(
			RuntimeGlobals.returnExportsFromRuntime
		);

		const useRequire =
			requireFunction ||
			interceptModuleExecution ||
			returnExportsFromRuntime ||
			moduleUsed ||
			exportsUsed;

		const result = {
			header: [],
			startup: []
		};

		let buf = result.header;
		let startup = result.startup;

		if (useRequire || moduleCache) {
			buf.push("// The module cache");
			buf.push("var __webpack_module_cache__ = {};");
			buf.push("");
		}

		if (useRequire) {
			buf.push("// The require function");
			buf.push(`function __webpack_require__(moduleId) {`);
			buf.push(Template.indent('"use strict";'));
			buf.push(Template.indent(this.renderRequire(renderContext, hooks)));
			buf.push("}");
			buf.push("");
		} else if (runtimeRequirements.has(RuntimeGlobals.requireScope)) {
			buf.push("// The require scope");
			buf.push("var __webpack_require__ = {};");
		}

		if (runtimeRequirements.has(RuntimeGlobals.moduleFactories)) {
			buf.push("");
			buf.push("// expose the modules object (__webpack_modules__)");
			buf.push(`${RuntimeGlobals.moduleFactories} = __webpack_modules__;`);
		}

		if (moduleCache) {
			buf.push("");
			buf.push("// expose the module cache");
			buf.push(`${RuntimeGlobals.moduleCache} = __webpack_module_cache__;`);
		}

		if (interceptModuleExecution) {
			buf.push("");
			buf.push("// expose the module execution interceptor");
			buf.push(`${RuntimeGlobals.interceptModuleExecution} = [];`);
		}

		buf.push("");
		if (!runtimeRequirements.has(RuntimeGlobals.startupNoDefault)) {
			if (chunkGraph.getNumberOfEntryModules(chunk) > 0) {
				/** @type {string[]} */
				const buf2 = [];
				const runtimeRequirements = chunkGraph.getTreeRuntimeRequirements(
					chunk
				);
				buf2.push(
					returnExportsFromRuntime
						? "// Load entry module and return exports"
						: "// Load entry module"
				);
				let i = chunkGraph.getNumberOfEntryModules(chunk);
				for (const entryModule of chunkGraph.getChunkEntryModulesIterable(
					chunk
				)) {
					const mayReturn =
						--i === 0 && returnExportsFromRuntime ? "return " : "";
					const moduleId = chunkGraph.getModuleId(entryModule);
					let moduleIdExpr = JSON.stringify(moduleId);
					if (runtimeRequirements.has(RuntimeGlobals.entryModuleId)) {
						moduleIdExpr = `${RuntimeGlobals.entryModuleId} = ${moduleIdExpr}`;
					}
					if (useRequire) {
						buf2.push(`${mayReturn}__webpack_require__(${moduleIdExpr});`);
					} else if (requireScopeUsed) {
						buf2.push(
							`__webpack_modules__[${moduleIdExpr}](0, 0, __webpack_require__);`
						);
					} else {
						buf2.push(`__webpack_modules__[${moduleIdExpr}]();`);
					}
				}
				if (runtimeRequirements.has(RuntimeGlobals.startup)) {
					buf.push(
						Template.asString([
							"// the startup function",
							`${RuntimeGlobals.startup} = ${runtimeTemplate.basicFunction(
								"",
								buf2
							)};`
						])
					);
					startup.push("// run startup");
					startup.push(`return ${RuntimeGlobals.startup}();`);
				} else {
					startup.push(
						Template.asString(["// startup", Template.asString(buf2)])
					);
				}
			} else if (runtimeRequirements.has(RuntimeGlobals.startup)) {
				buf.push(
					Template.asString([
						"// the startup function",
						"// It's empty as no entry modules are in this chunk",
						`${RuntimeGlobals.startup} = ${runtimeTemplate.basicFunction(
							"",
							""
						)}`
					])
				);
			}
		} else if (runtimeRequirements.has(RuntimeGlobals.startup)) {
			startup.push("// run startup");
			startup.push(`return ${RuntimeGlobals.startup}();`);
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
		const content = Template.asString([
			"// Check if module is in cache",
			"if(__webpack_module_cache__[moduleId]) {",
			Template.indent("return __webpack_module_cache__[moduleId].exports;"),
			"}",
			"// Create a new module (and put it into the cache)",
			"var module = __webpack_module_cache__[moduleId] = {",
			Template.indent(["i: moduleId,", "l: false,", "exports: {}"]),
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
				: Template.asString([
						"// Execute the module function",
						moduleExecution
				  ]),
			"",
			"// Flag the module as loaded",
			"module.l = true;",
			"",
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
