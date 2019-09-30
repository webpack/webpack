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
const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");

/** @typedef {import("webpack-sources").ConcatSource} ConcatSource */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./ModuleTemplate")} ModuleTemplate */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Compilation").AssetInfo} AssetInfo */
/** @typedef {import("./Module")} Module} */
/** @typedef {import("./util/Hash")} Hash} */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates} */
/** @typedef {import("./ModuleTemplate").RenderContext} RenderContext} */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate} */
/** @typedef {import("./ModuleGraph")} ModuleGraph} */
/** @typedef {import("./ChunkGraph")} ChunkGraph} */
/** @typedef {import("./Template").RenderManifestOptions} RenderManifestOptions} */
/** @typedef {import("./Template").RenderManifestEntry} RenderManifestEntry} */

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
 * @typedef {Object} UpdateHashForChunkContext
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 */

module.exports = class MainTemplate {
	/**
	 *
	 * @param {TODO=} outputOptions output options for the MainTemplate
	 */
	constructor(outputOptions) {
		/** @type {TODO?} */
		this.outputOptions = outputOptions || {};
		this.hooks = Object.freeze({
			/** @type {SyncWaterfallHook<[RenderManifestEntry[], RenderManifestOptions]>} */
			renderManifest: new SyncWaterfallHook(["result", "options"]),
			/** @type {SyncWaterfallHook<[string, RenderBootstrapContext]>} */
			require: new SyncWaterfallHook(["source", "renderContext"]),
			/** @type {SyncWaterfallHook<[Source, Chunk, string]>} */
			renderWithEntry: new SyncWaterfallHook(["source", "chunk", "hash"]),
			/** @type {SyncWaterfallHook<[string, object, AssetInfo]>} */
			assetPath: new SyncWaterfallHook(["path", "options", "assetInfo"]),
			/** @type {SyncHook<[Hash]>} */
			hash: new SyncHook(["hash"]),
			/** @type {SyncHook<[Hash, Chunk]>} */
			hashForChunk: new SyncHook(["hash", "chunk"]),

			// for compatibility:
			/** @type {SyncWaterfallHook<[string, Chunk, string, ModuleTemplate, DependencyTemplates]>} */
			bootstrap: new SyncWaterfallHook([
				"source",
				"chunk",
				"hash",
				"moduleTemplate",
				"dependencyTemplates"
			]),
			/** @type {SyncWaterfallHook<[string, Chunk, string]>} */
			localVars: new SyncWaterfallHook(["source", "chunk", "hash"]),
			/** @type {SyncWaterfallHook<[string, Chunk, string]>} */
			requireExtensions: new SyncWaterfallHook(["source", "chunk", "hash"]),
			/** @type {SyncWaterfallHook<[string, Chunk, string, string]>} */
			requireEnsure: new SyncWaterfallHook([
				"source",
				"chunk",
				"hash",
				"chunkIdExpression"
			])
		});
		this.hooks.require.tap("MainTemplate", (source, renderContext) => {
			const { chunk, chunkGraph } = renderContext;
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
			return Template.asString([
				source,
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
		});
	}

	// TODO webpack 6 remove
	// BACKWARD COMPAT START
	get requireFn() {
		return "__webpack_require__";
	}

	/**
	 * @deprecated
	 * @param {string} hash the hash
	 * @param {number=} length length of the hash
	 * @returns {string} generated code
	 */
	renderCurrentHashCode(hash, length) {
		if (length) {
			return `${RuntimeGlobals.getFullHash} ? ${
				RuntimeGlobals.getFullHash
			}().slice(0, ${length}) : ${hash.slice(0, length)}`;
		}
		return `${RuntimeGlobals.getFullHash} ? ${RuntimeGlobals.getFullHash}() : ${hash}`;
	}
	// BACKWARD COMPAT END

	/**
	 *
	 * @param {RenderManifestOptions} options render manifest options
	 * @returns {RenderManifestEntry[]} returns render manifest
	 */
	getRenderManifest(options) {
		const result = [];

		this.hooks.renderManifest.call(result, options);

		return result;
	}

	/**
	 * @param {RenderBootstrapContext} renderContext options object
	 * @returns {{ header: string[], startup: string[] }} the generated source of the bootstrap code
	 */
	renderBootstrap(renderContext) {
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
			buf.push(Template.indent(this.hooks.require.call("", renderContext)));
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
	 * @param {ModuleTemplate} moduleTemplate ModuleTemplate instance for render
	 * @param {MainRenderContext} renderContext options object
	 * @returns {Source} the newly generated source from rendering
	 */
	render(moduleTemplate, renderContext) {
		const { hash, chunk, chunkGraph, runtimeTemplate } = renderContext;

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
				moduleTemplate,
				"/******/ \t"
			)
		);
		source.add(");\n");

		const bootstrap = this.renderBootstrap(renderContext);

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
		let finalSource = source;
		if (chunkGraph.getNumberOfEntryModules(chunk) > 0) {
			finalSource = this.hooks.renderWithEntry.call(finalSource, chunk, hash);
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
	 *
	 * @param {object} options get public path options
	 * @returns {string} hook call
	 */
	getPublicPath(options) {
		return this.hooks.assetPath.call(
			this.outputOptions.publicPath || "",
			options,
			undefined
		);
	}

	getAssetPath(path, options) {
		return this.hooks.assetPath.call(path, options, undefined);
	}

	getAssetPathWithInfo(path, options) {
		const assetInfo = {};
		// TODO webpack 5: refactor assetPath hook to receive { path, info } object
		const newPath = this.hooks.assetPath.call(path, options, assetInfo);
		return { path: newPath, info: assetInfo };
	}

	/**
	 * Updates hash with information from this template
	 * @param {Hash} hash the hash to update
	 * @returns {void}
	 */
	updateHash(hash) {
		hash.update("maintemplate");
		hash.update("3");
		this.hooks.hash.call(hash);
	}

	/**
	 * Updates hash with chunk-specific information from this template
	 * @param {Hash} hash the hash to update
	 * @param {Chunk} chunk the chunk
	 * @param {UpdateHashForChunkContext} context options object
	 * @returns {void}
	 */
	updateHashForChunk(hash, chunk, context) {
		this.updateHash(hash);
		this.hooks.hashForChunk.call(hash, chunk);
		const bootstrap = this.renderBootstrap({
			hash: "0000",
			chunk,
			chunkGraph: context.chunkGraph,
			moduleGraph: context.moduleGraph,
			runtimeTemplate: context.runtimeTemplate
		});
		for (const key of Object.keys(bootstrap)) {
			hash.update(key);
			for (const line of bootstrap[key]) {
				hash.update(line);
			}
		}
	}
};
