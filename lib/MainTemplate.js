/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook, SyncHook, SyncBailHook } = require("tapable");
const {
	ConcatSource,
	OriginalSource,
	PrefixSource,
	RawSource
} = require("webpack-sources");
const Template = require("./Template");

/** @typedef {import("webpack-sources").ConcatSource} ConcatSource */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./ModuleTemplate")} ModuleTemplate */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Module")} Module} */
/** @typedef {import("./util/createHash").Hash} Hash} */
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

// require function shortcuts:
// __webpack_require__.s = the module id of the entry point
// __webpack_require__.c = the module cache
// __webpack_require__.m = the module functions
// __webpack_require__.p = the bundle public path
// __webpack_require__.i = the identity function used for harmony imports
// __webpack_require__.e = the chunk ensure function
// __webpack_require__.d = the exported property define getter function
// __webpack_require__.o = Object.prototype.hasOwnProperty.call
// __webpack_require__.r = define compatibility on export
// __webpack_require__.t = create a fake namespace object
// __webpack_require__.n = compatibility get default export
// __webpack_require__.h = the webpack hash
// __webpack_require__.w = an object containing all installed WebAssembly.Instance export objects keyed by module id
// __webpack_require__.oe = the uncaught error handler for the webpack runtime
// __webpack_require__.nc = the script nonce

module.exports = class MainTemplate {
	/**
	 *
	 * @param {TODO=} outputOptions output options for the MainTemplate
	 */
	constructor(outputOptions) {
		/** @type {TODO?} */
		this.outputOptions = outputOptions || {};
		this.hooks = Object.freeze({
			/** @type {SyncWaterfallHook<TODO[], RenderManifestOptions>} */
			renderManifest: new SyncWaterfallHook(["result", "options"]),
			/** @type {SyncWaterfallHook<Source, ModuleTemplate, MainRenderContext>} */
			modules: new SyncWaterfallHook([
				"source",
				"moduleTemplate",
				"renderContext"
			]),
			/** @type {SyncWaterfallHook<string, string, MainRenderContext>} */
			moduleObj: new SyncWaterfallHook([
				"source",
				"moduleIdExpression",
				"renderContext"
			]),
			/** @type {SyncWaterfallHook<string, string, MainRenderContext>} */
			requireEnsure: new SyncWaterfallHook([
				"source",
				"chunkIdExpression",
				"renderContext"
			]),
			/** @type {SyncWaterfallHook<string, ModuleTemplate, MainRenderContext>} */
			bootstrap: new SyncWaterfallHook([
				"source",
				"moduleTemplate",
				"renderContext"
			]),
			localVars: new SyncWaterfallHook(["source", "chunk", "hash"]),
			/** @type {SyncWaterfallHook<string, MainRenderContext>} */
			require: new SyncWaterfallHook(["source", "renderContext"]),
			/** @type {SyncWaterfallHook<string, MainRenderContext>} */
			requireExtensions: new SyncWaterfallHook(["source", "renderContext"]),
			/** @type {SyncWaterfallHook<string, Chunk, string>} */
			beforeStartup: new SyncWaterfallHook(["source", "chunk", "hash"]),
			/** @type {SyncWaterfallHook<string, MainRenderContext>} */
			startup: new SyncWaterfallHook(["source", "renderContext"]),
			/** @type {SyncWaterfallHook<Source, ModuleTemplate, MainRenderContext>} */
			render: new SyncWaterfallHook([
				"source",
				"moduleTemplate",
				"renderContext"
			]),
			renderWithEntry: new SyncWaterfallHook(["source", "chunk", "hash"]),
			moduleRequire: new SyncWaterfallHook([
				"source",
				"chunk",
				"hash",
				"moduleIdExpression"
			]),
			/** @type {SyncWaterfallHook<string, {moduleId: string, module: string}, MainRenderContext>} */
			addModule: new SyncWaterfallHook([
				"source",
				"expressions",
				"renderContext"
			]),
			currentHash: new SyncWaterfallHook(["source", "requestedLength"]),
			assetPath: new SyncWaterfallHook(["path", "options"]),
			hash: new SyncHook(["hash"]),
			hashForChunk: new SyncHook(["hash", "chunk"]),
			globalHashPaths: new SyncWaterfallHook(["paths"]),
			globalHash: new SyncBailHook(["chunk", "paths"]),

			// TODO this should be moved somewhere else
			// It's weird here
			hotBootstrap: new SyncWaterfallHook(["source", "chunk", "hash"])
		});
		this.hooks.startup.tap(
			"MainTemplate",
			(source, { chunk, hash, chunkGraph }) => {
				/** @type {string[]} */
				const buf = [];
				if (chunkGraph.getNumberOfEntryModules(chunk) > 0) {
					buf.push("// Load entry module and return exports");
					let i = chunkGraph.getNumberOfEntryModules(chunk);
					for (const entryModule of chunkGraph.getChunkEntryModulesIterable(
						chunk
					)) {
						const mayReturn = --i === 0 ? "return " : "";
						const moduleId = chunkGraph.getModuleId(entryModule);
						buf.push(
							`${mayReturn}${this.renderRequireFunctionForModule(
								hash,
								chunk,
								JSON.stringify(moduleId)
							)}(${this.requireFn}.s = ${JSON.stringify(moduleId)});`
						);
					}
				}
				return Template.asString(buf);
			}
		);
		this.hooks.render.tap(
			"MainTemplate",
			(bootstrapSource, moduleTemplate, renderContext) => {
				const source = new ConcatSource();
				source.add("/******/ (function(modules) { // webpackBootstrap\n");
				source.add(new PrefixSource("/******/", bootstrapSource));
				source.add("/******/ })\n");
				source.add(
					"/************************************************************************/\n"
				);
				source.add("/******/ (");
				source.add(
					this.hooks.modules.call(
						new RawSource(""),
						moduleTemplate,
						renderContext
					)
				);
				source.add(")");
				return source;
			}
		);
		this.hooks.localVars.tap("MainTemplate", (source, chunk, hash) => {
			return Template.asString([
				source,
				"// The module cache",
				"var installedModules = {};"
			]);
		});
		this.hooks.require.tap("MainTemplate", (source, renderContext) => {
			const { chunk, hash } = renderContext;
			return Template.asString([
				source,
				"// Check if module is in cache",
				"if(installedModules[moduleId]) {",
				Template.indent("return installedModules[moduleId].exports;"),
				"}",
				"// Create a new module (and put it into the cache)",
				"var module = installedModules[moduleId] = {",
				Template.indent(
					this.hooks.moduleObj.call("", "moduleId", renderContext)
				),
				"};",
				"",
				Template.asString(
					outputOptions.strictModuleExceptionHandling
						? [
								"// Execute the module function",
								"var threw = true;",
								"try {",
								Template.indent([
									`modules[moduleId].call(module.exports, module, module.exports, ${this.renderRequireFunctionForModule(
										hash,
										chunk,
										"moduleId"
									)});`,
									"threw = false;"
								]),
								"} finally {",
								Template.indent([
									"if(threw) delete installedModules[moduleId];"
								]),
								"}"
						  ]
						: [
								"// Execute the module function",
								`modules[moduleId].call(module.exports, module, module.exports, ${this.renderRequireFunctionForModule(
									hash,
									chunk,
									"moduleId"
								)});`
						  ]
				),
				"",
				"// Flag the module as loaded",
				"module.l = true;",
				"",
				"// Return the exports of the module",
				"return module.exports;"
			]);
		});
		this.hooks.moduleObj.tap("MainTemplate", () => {
			return Template.asString(["i: moduleId,", "l: false,", "exports: {}"]);
		});
		this.hooks.requireExtensions.tap(
			"MainTemplate",
			(source, renderContext) => {
				const { chunk, hash } = renderContext;
				const buf = [];
				const chunkMaps = chunk.getChunkMaps();
				// Check if there are non initial chunks which need to be imported using require-ensure
				if (Object.keys(chunkMaps.hash).length) {
					buf.push("// This file contains only the entry chunk.");
					buf.push("// The chunk loading function for additional chunks");
					buf.push(`${this.requireFn}.e = function requireEnsure(chunkId) {`);
					buf.push(Template.indent("var promises = [];"));
					buf.push(
						Template.indent(
							this.hooks.requireEnsure.call("", "chunkId", renderContext)
						)
					);
					buf.push(Template.indent("return Promise.all(promises);"));
					buf.push("};");
				}
				buf.push("");
				buf.push("// expose the modules object (__webpack_modules__)");
				buf.push(`${this.requireFn}.m = modules;`);

				buf.push("");
				buf.push("// expose the module cache");
				buf.push(`${this.requireFn}.c = installedModules;`);

				buf.push("");
				buf.push("// define getter function for harmony exports");
				buf.push(`${this.requireFn}.d = function(exports, name, getter) {`);
				buf.push(
					Template.indent([
						`if(!${this.requireFn}.o(exports, name)) {`,
						Template.indent([
							"Object.defineProperty(exports, name, { enumerable: true, get: getter });"
						]),
						"}"
					])
				);
				buf.push("};");

				buf.push("");
				buf.push("// define __esModule on exports");
				buf.push(`${this.requireFn}.r = function(exports) {`);
				buf.push(
					Template.indent([
						"if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {",
						Template.indent([
							"Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });"
						]),
						"}",
						"Object.defineProperty(exports, '__esModule', { value: true });"
					])
				);
				buf.push("};");

				buf.push("");
				buf.push("// create a fake namespace object");
				buf.push("// mode & 1: value is a module id, require it");
				buf.push("// mode & 2: merge all properties of value into the ns");
				buf.push("// mode & 4: return value when already ns object");
				buf.push("// mode & 8|1: behave like require");
				buf.push(`${this.requireFn}.t = function(value, mode) {`);
				buf.push(
					Template.indent([
						`if(mode & 1) value = ${this.requireFn}(value);`,
						`if(mode & 8) return value;`,
						"if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;",
						"var ns = Object.create(null);",
						`${this.requireFn}.r(ns);`,
						"Object.defineProperty(ns, 'default', { enumerable: true, value: value });",
						"if(mode & 2 && typeof value != 'string') for(var key in value) " +
							`${this.requireFn}.d(ns, key, function(key) { ` +
							"return value[key]; " +
							"}.bind(null, key));",
						"return ns;"
					])
				);
				buf.push("};");

				buf.push("");
				buf.push(
					"// getDefaultExport function for compatibility with non-harmony modules"
				);
				buf.push(this.requireFn + ".n = function(module) {");
				buf.push(
					Template.indent([
						"var getter = module && module.__esModule ?",
						Template.indent([
							"function getDefault() { return module['default']; } :",
							"function getModuleExports() { return module; };"
						]),
						`${this.requireFn}.d(getter, 'a', getter);`,
						"return getter;"
					])
				);
				buf.push("};");

				buf.push("");
				buf.push("// Object.prototype.hasOwnProperty.call");
				buf.push(
					`${
						this.requireFn
					}.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };`
				);

				const publicPath = this.getPublicPath({
					hash: hash
				});
				buf.push("");
				buf.push("// __webpack_public_path__");
				buf.push(`${this.requireFn}.p = ${JSON.stringify(publicPath)};`);
				return Template.asString(buf);
			}
		);

		this.requireFn = "__webpack_require__";
	}

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
	 * @param {ModuleTemplate} moduleTemplate ModuleTemplate instance for render
	 * @param {MainRenderContext} renderContext options object
	 * @returns {ConcatSource} the newly generated source from rendering
	 */
	render(moduleTemplate, renderContext) {
		const { hash, chunk, chunkGraph } = renderContext;
		const buf = [];
		buf.push(this.hooks.bootstrap.call("", moduleTemplate, renderContext));
		buf.push(this.hooks.localVars.call("", chunk, hash));
		buf.push("");
		buf.push("// The require function");
		buf.push(`function ${this.requireFn}(moduleId) {`);
		buf.push(Template.indent(this.hooks.require.call("", renderContext)));
		buf.push("}");
		buf.push("");
		buf.push(
			Template.asString(this.hooks.requireExtensions.call("", renderContext))
		);
		buf.push("");
		buf.push(Template.asString(this.hooks.beforeStartup.call("", chunk, hash)));
		buf.push(Template.asString(this.hooks.startup.call("", renderContext)));
		let source = this.hooks.render.call(
			new OriginalSource(
				Template.prefix(buf, " \t") + "\n",
				"webpack/bootstrap"
			),
			moduleTemplate,
			renderContext
		);
		if (chunkGraph.getNumberOfEntryModules(chunk) > 0) {
			source = this.hooks.renderWithEntry.call(source, chunk, hash);
		}
		if (!source) {
			throw new Error(
				"Compiler error: MainTemplate plugin 'render' should return something"
			);
		}
		chunk.rendered = true;
		return new ConcatSource(source, ";");
	}

	/**
	 *
	 * @param {string} hash hash for render fn
	 * @param {Chunk} chunk Chunk instance for require
	 * @param {(number|string)=} varModuleId module id
	 * @returns {TODO} the moduleRequire hook call return signature
	 */
	renderRequireFunctionForModule(hash, chunk, varModuleId) {
		return this.hooks.moduleRequire.call(
			this.requireFn,
			chunk,
			hash,
			varModuleId
		);
	}

	/**
	 *
	 * @param {string} varModuleId module id
	 * @param {string} varModule Module instance
	 * @param {MainRenderContext} renderContext the render context
	 * @returns {TODO} renderAddModule call
	 */
	renderAddModule(varModuleId, varModule, renderContext) {
		return this.hooks.addModule.call(
			`modules[${varModuleId}] = ${varModule};`,
			{
				moduleId: varModuleId,
				module: varModule
			},
			renderContext
		);
	}

	/**
	 *
	 * @param {string} hash string hash
	 * @param {number=} length length
	 * @returns {string} call hook return
	 */
	renderCurrentHashCode(hash, length) {
		length = length || Infinity;
		return this.hooks.currentHash.call(
			JSON.stringify(hash.substr(0, length)),
			length
		);
	}

	/**
	 *
	 * @param {object} options get public path options
	 * @returns {string} hook call
	 */
	getPublicPath(options) {
		return this.hooks.assetPath.call(
			this.outputOptions.publicPath || "",
			options
		);
	}

	getAssetPath(path, options) {
		return this.hooks.assetPath.call(path, options);
	}

	/**
	 * Updates hash with information from this template
	 * @param {Hash} hash the hash to update
	 * @returns {void}
	 */
	updateHash(hash) {
		hash.update("maintemplate");
		hash.update("3");
		hash.update(this.outputOptions.publicPath + "");
		this.hooks.hash.call(hash);
	}

	/**
	 * Updates hash with chunk-specific information from this template
	 * @param {Hash} hash the hash to update
	 * @param {Chunk} chunk the chunk
	 * @returns {void}
	 */
	updateHashForChunk(hash, chunk) {
		this.updateHash(hash);
		this.hooks.hashForChunk.call(hash, chunk);
	}

	useChunkHash(chunk) {
		const paths = this.hooks.globalHashPaths.call([]);
		return !this.hooks.globalHash.call(chunk, paths);
	}
};
