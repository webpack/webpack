/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
const Compilation = require("../Compilation");
const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const {
	getChunkFilenameTemplate,
	chunkHasJs
} = require("../javascript/JavascriptModulesPlugin");
const { getInitialChunkIds } = require("../javascript/StartupHelpers");
const compileBooleanMatcher = require("../util/compileBooleanMatcher");
const { getUndoPath } = require("../util/identifier");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */

/**
 * @typedef {Object} JsonpCompilationPluginHooks
 * @property {SyncWaterfallHook<[string, Chunk]>} linkPreload
 * @property {SyncWaterfallHook<[string, Chunk]>} linkPrefetch
 */

/** @type {WeakMap<Compilation, JsonpCompilationPluginHooks>} */
const compilationHooksMap = new WeakMap();

class ModuleChunkLoadingRuntimeModule extends RuntimeModule {
	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {JsonpCompilationPluginHooks} hooks
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
				linkPreload: new SyncWaterfallHook(["source", "chunk"]),
				linkPrefetch: new SyncWaterfallHook(["source", "chunk"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	/**
	 * @param {ReadonlySet<string>} runtimeRequirements runtime requirements
	 */
	constructor(runtimeRequirements) {
		super("import chunk loading", RuntimeModule.STAGE_ATTACH);
		this._runtimeRequirements = runtimeRequirements;
	}

	/**
	 * @private
	 * @param {Chunk} chunk chunk
	 * @param {string} rootOutputDir root output directory
	 * @returns {string} generated code
	 */
	_generateBaseUri(chunk, rootOutputDir) {
		const options = chunk.getEntryOptions();
		if (options && options.baseUri) {
			return `${RuntimeGlobals.baseURI} = ${JSON.stringify(options.baseUri)};`;
		}
		const compilation = /** @type {Compilation} */ (this.compilation);
		const {
			outputOptions: { importMetaName }
		} = compilation;
		return `${RuntimeGlobals.baseURI} = new URL(${JSON.stringify(
			rootOutputDir
		)}, ${importMetaName}.url);`;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const chunkGraph = /** @type {ChunkGraph} */ (this.chunkGraph);
		const chunk = /** @type {Chunk} */ (this.chunk);
		const {
			runtimeTemplate,
			outputOptions: { importFunctionName }
		} = compilation;
		const fn = RuntimeGlobals.ensureChunkHandlers;
		const withBaseURI = this._runtimeRequirements.has(RuntimeGlobals.baseURI);
		const withExternalInstallChunk = this._runtimeRequirements.has(
			RuntimeGlobals.externalInstallChunk
		);
		const withLoading = this._runtimeRequirements.has(
			RuntimeGlobals.ensureChunkHandlers
		);
		const withOnChunkLoad = this._runtimeRequirements.has(
			RuntimeGlobals.onChunksLoaded
		);
		const withHmr = this._runtimeRequirements.has(
			RuntimeGlobals.hmrDownloadUpdateHandlers
		);
		const conditionMap = chunkGraph.getChunkConditionMap(chunk, chunkHasJs);
		const hasJsMatcher = compileBooleanMatcher(conditionMap);
		const initialChunkIds = getInitialChunkIds(chunk, chunkGraph, chunkHasJs);

		const outputName = compilation.getPath(
			getChunkFilenameTemplate(chunk, compilation.outputOptions),
			{
				chunk,
				contentHashType: "javascript"
			}
		);
		const rootOutputDir = getUndoPath(
			outputName,
			/** @type {string} */ (compilation.outputOptions.path),
			true
		);

		const stateExpression = withHmr
			? `${RuntimeGlobals.hmrRuntimeStatePrefix}_module`
			: undefined;

		return Template.asString([
			withBaseURI
				? this._generateBaseUri(chunk, rootOutputDir)
				: "// no baseURI",
			"",
			"// object to store loaded and loading chunks",
			"// undefined = chunk not loaded, null = chunk preloaded/prefetched",
			"// [resolve, Promise] = chunk loading, 0 = chunk loaded",
			`var installedChunks = ${
				stateExpression ? `${stateExpression} = ${stateExpression} || ` : ""
			}{`,
			Template.indent(
				Array.from(initialChunkIds, id => `${JSON.stringify(id)}: 0`).join(
					",\n"
				)
			),
			"};",
			"",
			withLoading || withExternalInstallChunk
				? `var installChunk = ${runtimeTemplate.basicFunction("data", [
						runtimeTemplate.destructureObject(
							["ids", "modules", "runtime"],
							"data"
						),
						'// add "modules" to the modules object,',
						'// then flag all "ids" as loaded and fire callback',
						"var moduleId, chunkId, i = 0;",
						"for(moduleId in modules) {",
						Template.indent([
							`if(${RuntimeGlobals.hasOwnProperty}(modules, moduleId)) {`,
							Template.indent(
								`${RuntimeGlobals.moduleFactories}[moduleId] = modules[moduleId];`
							),
							"}"
						]),
						"}",
						`if(runtime) runtime(${RuntimeGlobals.require});`,
						"for(;i < ids.length; i++) {",
						Template.indent([
							"chunkId = ids[i];",
							`if(${RuntimeGlobals.hasOwnProperty}(installedChunks, chunkId) && installedChunks[chunkId]) {`,
							Template.indent("installedChunks[chunkId][0]();"),
							"}",
							"installedChunks[ids[i]] = 0;"
						]),
						"}",
						withOnChunkLoad ? `${RuntimeGlobals.onChunksLoaded}();` : ""
				  ])}`
				: "// no install chunk",
			"",
			withLoading
				? Template.asString([
						`${fn}.j = ${runtimeTemplate.basicFunction(
							"chunkId, promises",
							hasJsMatcher !== false
								? Template.indent([
										"// import() chunk loading for javascript",
										`var installedChunkData = ${RuntimeGlobals.hasOwnProperty}(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;`,
										'if(installedChunkData !== 0) { // 0 means "already installed".',
										Template.indent([
											"",
											'// a Promise means "currently loading".',
											"if(installedChunkData) {",
											Template.indent([
												"promises.push(installedChunkData[1]);"
											]),
											"} else {",
											Template.indent([
												hasJsMatcher === true
													? "if(true) { // all chunks have JS"
													: `if(${hasJsMatcher("chunkId")}) {`,
												Template.indent([
													"// setup Promise in chunk cache",
													`var promise = ${importFunctionName}(${JSON.stringify(
														rootOutputDir
													)} + ${
														RuntimeGlobals.getChunkScriptFilename
													}(chunkId)).then(installChunk, ${runtimeTemplate.basicFunction(
														"e",
														[
															"if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined;",
															"throw e;"
														]
													)});`,
													`var promise = Promise.race([promise, new Promise(${runtimeTemplate.expressionFunction(
														`installedChunkData = installedChunks[chunkId] = [resolve]`,
														"resolve"
													)})])`,
													`promises.push(installedChunkData[1] = promise);`
												]),
												hasJsMatcher === true
													? "}"
													: "} else installedChunks[chunkId] = 0;"
											]),
											"}"
										]),
										"}"
								  ])
								: Template.indent(["installedChunks[chunkId] = 0;"])
						)};`
				  ])
				: "// no chunk on demand loading",
			"",
			withExternalInstallChunk
				? Template.asString([
						`${RuntimeGlobals.externalInstallChunk} = installChunk;`
				  ])
				: "// no external install chunk",
			"",
			withOnChunkLoad
				? `${
						RuntimeGlobals.onChunksLoaded
				  }.j = ${runtimeTemplate.returningFunction(
						"installedChunks[chunkId] === 0",
						"chunkId"
				  )};`
				: "// no on chunks loaded"
		]);
	}
}

module.exports = ModuleChunkLoadingRuntimeModule;
