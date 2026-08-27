/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
/** @import Compilation from "../Compilation" */
const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const {
	generateJavascriptHMR
} = require("../hmr/JavascriptHotModuleReplacementHelper");
const { chunkHasJs } = require("../javascript/JavascriptModulesPlugin");
const { getInitialChunkIds } = require("../javascript/StartupHelpers");
const { renderBaseUri } = require("../runtime/baseUri");
const compileBooleanMatcher = require("../util/compileBooleanMatcher");
const createHooksRegistry = require("../util/createHooksRegistry");
const memoize = require("../util/memoize");

const getAPIPlugin = memoize(() => require("../APIPlugin"));

/** @import Chunk from "../Chunk" */
/** @import ChunkGraph from "../ChunkGraph" */
/** @import { ReadOnlyRuntimeRequirements } from "../Module" */

const createCompilationHooks = () => ({
	/**
	 * @type {SyncWaterfallHook<[string, Chunk]>}
	 * @since 5.41.0
	 */
	linkPreload: new SyncWaterfallHook(["source", "chunk"]),
	/**
	 * @type {SyncWaterfallHook<[string, Chunk]>}
	 * @since 5.41.0
	 */
	linkPrefetch: new SyncWaterfallHook(["source", "chunk"])
});

/**
 * @typedef {ReturnType<typeof createCompilationHooks>} JsonpCompilationPluginHooks
 */

class ModuleChunkLoadingRuntimeModule extends RuntimeModule {
	/**
	 * Creates an instance of ModuleChunkLoadingRuntimeModule.
	 * @param {ReadOnlyRuntimeRequirements} runtimeRequirements runtime requirements
	 */
	constructor(runtimeRequirements) {
		super("import chunk loading", RuntimeModule.STAGE_ATTACH);
		/** @type {ReadOnlyRuntimeRequirements} */
		this._runtimeRequirements = runtimeRequirements;
	}

	/**
	 * Returns generated code.
	 * @private
	 * @param {Chunk} chunk chunk
	 * @param {string} rootOutputDir root output directory
	 * @returns {string} generated code
	 */
	_generateBaseUri(chunk, rootOutputDir) {
		const options = chunk.getEntryOptions();
		const compilation = /** @type {Compilation} */ (this.compilation);
		const {
			outputOptions: { importMetaName }
		} = compilation;
		return renderBaseUri(
			options ? options.baseUri : undefined,
			`new URL(${JSON.stringify(rootOutputDir)}, ${importMetaName}.url)`
		);
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const chunkGraph = /** @type {ChunkGraph} */ (this.chunkGraph);
		const chunk = /** @type {Chunk} */ (this.chunk);
		const environment = compilation.outputOptions.environment;
		const {
			runtimeTemplate,
			outputOptions: {
				importFunctionName,
				crossOriginLoading,
				charset,
				resourceHints
			}
		} = compilation;
		const dedupePrefetch = Boolean(resourceHints && resourceHints.dedupe);
		const fn = RuntimeGlobals.ensureChunkHandlers;
		const withBaseURI = this._runtimeRequirements.has(RuntimeGlobals.baseURI);
		const withExternalInstallChunk = this._runtimeRequirements.has(
			RuntimeGlobals.externalInstallChunk
		);
		const withAnalyzableImport = this._runtimeRequirements.has(
			RuntimeGlobals.analyzableChunkImport
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
		const withHmrManifest = this._runtimeRequirements.has(
			RuntimeGlobals.hmrDownloadManifest
		);
		// `.f.j` serves `ensureChunk`: an analyzable import dispatches every handler but
		// this one. HMR's force-load knows only a chunk id, so it needs the loader too.
		const withJsLoading =
			withLoading &&
			(this._runtimeRequirements.has(RuntimeGlobals.ensureChunk) || withHmr);
		const { linkPreload, linkPrefetch } =
			ModuleChunkLoadingRuntimeModule.getCompilationHooks(compilation);
		const isNeutralPlatform = runtimeTemplate.isNeutralPlatform();
		const withPrefetch =
			(environment.document || isNeutralPlatform) &&
			this._runtimeRequirements.has(RuntimeGlobals.prefetchChunkHandlers) &&
			chunk.hasChildByOrder(chunkGraph, "prefetch", true, chunkHasJs);
		const withPreload =
			(environment.document || isNeutralPlatform) &&
			this._runtimeRequirements.has(RuntimeGlobals.preloadChunkHandlers) &&
			chunk.hasChildByOrder(chunkGraph, "preload", true, chunkHasJs);
		// Under module output each hinted chunk is a known file, so the urls are written
		// out and read by id rather than built from the chunk id at runtime.
		const bakedChunkUrls =
			withPrefetch || withPreload
				? runtimeTemplate.analyzableChunkScriptUrls(
						chunk,
						chunkGraph,
						this._runtimeRequirements,
						this
					)
				: null;
		// A hint is best-effort, so an id an incomplete map lacks is not worth a per-id
		// fallback — only a complete map replaces the runtime name lookup.
		const chunkUrls =
			bakedChunkUrls !== null && bakedChunkUrls.complete
				? bakedChunkUrls.urls
				: null;
		const conditionMap = chunkGraph.getChunkConditionMap(chunk, chunkHasJs);
		const hasJsMatcher = compileBooleanMatcher(conditionMap);
		const initialChunkIds = getInitialChunkIds(chunk, chunkGraph, chunkHasJs);

		const rootOutputDir = runtimeTemplate.chunkRootOutputDir(chunk, true);

		const { publicPath } = compilation.outputOptions;
		// `import()` resolves a bare specifier as a package name, so a public path that
		// leaves one — empty, or a plain relative directory — needs an explicit `./`.
		// A runtime override can swap in an absolute path, so leave those alone.
		const chunkImportBase =
			publicPath === "auto"
				? JSON.stringify(rootOutputDir)
				: typeof publicPath === "string" &&
					  !/^(?:\.{0,2}\/|[a-zA-Z][\w+.-]*:)/.test(publicPath) &&
					  !getAPIPlugin().usesRuntimePublicPathOverride(compilation)
					? `"./" + ${RuntimeGlobals.publicPath}`
					: RuntimeGlobals.publicPath;

		const stateExpression = withHmr
			? `${RuntimeGlobals.hmrRuntimeStatePrefix}_module`
			: undefined;

		const cst = runtimeTemplate.renderConst();
		const lt = runtimeTemplate.renderLet();
		const installedChunksObject = `{\n${Template.indent(
			Array.from(initialChunkIds, (id) => `${JSON.stringify(id)}: 0`).join(
				",\n"
			)
		)}\n}`;
		// Every part below that reads the table. A chunk asking only for `.b` gets this
		// module for the base uri alone, and then has nothing to look up.
		const withInstalledChunks =
			withLoading ||
			withExternalInstallChunk ||
			withAnalyzableImport ||
			withOnChunkLoad ||
			withHmr ||
			withPrefetch ||
			withPreload;
		// The url is read through a thunk so a runtime hinting at many chunks builds only
		// the one it appends.
		/**
		 * @param {string} id expression naming the chunk whose url is wanted
		 * @returns {string} expression evaluating to its url
		 */
		const chunkUrl = (id) =>
			chunkUrls === null
				? `${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkScriptFilename}(${id})`
				: `chunkUrls[${id}]()`;
		return Template.asString([
			withBaseURI
				? this._generateBaseUri(chunk, rootOutputDir)
				: "// no baseURI",
			"",
			...(chunkUrls
				? [
						`${cst} chunkUrls = {\n${Template.indent(
							Array.from(
								chunkUrls,
								([id, url]) =>
									`${JSON.stringify(String(id))}: ${runtimeTemplate.returningFunction(url)}`
							).join(",\n")
						)}\n};`,
						""
					]
				: []),
			withInstalledChunks
				? Template.asString([
						"// object to store loaded and loading chunks",
						"// undefined = chunk not loaded, null = chunk preloaded/prefetched",
						"// [resolve, Promise] = chunk loading, 0 = chunk loaded",
						`${cst} installedChunks = ${
							stateExpression
								? runtimeTemplate.assignOr(
										stateExpression,
										installedChunksObject
									)
								: installedChunksObject
						};`
					])
				: "// no installed chunks",
			"",
			withLoading || withExternalInstallChunk || withAnalyzableImport
				? `${cst} installChunk = ${runtimeTemplate.basicFunction("data", [
						runtimeTemplate.destructureObject(
							[
								RuntimeGlobals.esmIds,
								RuntimeGlobals.esmModules,
								RuntimeGlobals.esmRuntime
							],
							"data"
						),
						'// add "modules" to the modules object,',
						'// then flag all "ids" as loaded and fire callback',
						"var moduleId, chunkId, i = 0;",
						`for(moduleId in ${RuntimeGlobals.esmModules}) {`,
						Template.indent([
							`if(${RuntimeGlobals.hasOwnProperty}(${RuntimeGlobals.esmModules}, moduleId)) {`,
							Template.indent(
								`${RuntimeGlobals.moduleFactories}[moduleId] = ${RuntimeGlobals.esmModules}[moduleId];`
							),
							"}"
						]),
						"}",
						`if(${RuntimeGlobals.esmRuntime}) ${RuntimeGlobals.esmRuntime}(${RuntimeGlobals.require});`,
						`for(;i < ${RuntimeGlobals.esmIds}.length; i++) {`,
						Template.indent([
							`chunkId = ${RuntimeGlobals.esmIds}[i];`,
							`if(${RuntimeGlobals.hasOwnProperty}(installedChunks, chunkId) && installedChunks[chunkId]) {`,
							Template.indent("installedChunks[chunkId][0]();"),
							"}",
							"installedChunks[chunkId] = 0;"
						]),
						"}",
						withOnChunkLoad ? `${RuntimeGlobals.onChunksLoaded}();` : ""
					])}`
				: "// no install chunk",
			"",
			withJsLoading
				? Template.asString([
						`${fn}.j = ${runtimeTemplate.basicFunction(
							"chunkId, promises",
							hasJsMatcher !== false
								? Template.indent([
										"// import() chunk loading for javascript",
										`${lt} installedChunkData = ${RuntimeGlobals.hasOwnProperty}(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;`,
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
													`${lt} promise = ${importFunctionName}(${chunkImportBase} + ${
														RuntimeGlobals.getChunkScriptFilename
													}(chunkId)).then(installChunk, ${runtimeTemplate.basicFunction(
														"e",
														[
															"if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined;",
															"throw e;"
														]
													)});`,
													`promise = Promise.race([promise, new Promise(${runtimeTemplate.expressionFunction(
														"installedChunkData = installedChunks[chunkId] = [resolve]",
														"resolve"
													)})])`,
													"promises.push(installedChunkData[1] = promise);"
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
			withPrefetch && hasJsMatcher !== false
				? `${
						RuntimeGlobals.prefetchChunkHandlers
					}.j = ${runtimeTemplate.basicFunction("chunkId", [
						// prefetch is a browser-only resource hint; no-op without a DOM (e.g. node side of a universal build)
						isNeutralPlatform
							? "if (typeof document === 'undefined') return;"
							: "",
						`if((!${
							RuntimeGlobals.hasOwnProperty
						}(installedChunks, chunkId) || installedChunks[chunkId] === undefined) && ${
							hasJsMatcher === true ? "true" : hasJsMatcher("chunkId")
						}) {`,
						Template.indent([
							// A hint is best-effort, so an id no url was written for is
							// skipped rather than turned into a bogus href.
							...(chunkUrls ? ["if(!chunkUrls[chunkId]) return;"] : []),
							"installedChunks[chunkId] = null;",
							linkPrefetch.call(
								Template.asString([
									`${cst} link = document.createElement('link');`,
									charset ? "link.charset = 'utf-8';" : "",
									crossOriginLoading
										? `link.crossOrigin = ${JSON.stringify(
												crossOriginLoading
											)};`
										: "",
									`if (${RuntimeGlobals.scriptNonce}) {`,
									Template.indent(
										`link.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
									),
									"}",
									'link.rel = "prefetch";',
									'link.as = "script";',
									`link.href = ${chunkUrl("chunkId")};`
								]),
								chunk
							),
							dedupePrefetch
								? Template.asString([
										// Chrome re-requests a resource when a prefetch link is added
										// after it was already (pre)loaded via markup; skip in that case.
										`${cst} links = document.getElementsByTagName("link");`,
										`for(${lt} i = 0; i < links.length; i++) {`,
										Template.indent([
											`${cst} l = links[i];`,
											'if(l.href === link.href && (l.rel === "prefetch" || l.rel === "preload" || l.rel === "modulepreload")) return;'
										]),
										"}"
									])
								: "",
							"document.head.appendChild(link);"
						]),
						"}"
					])};`
				: "// no prefetching",
			"",
			withPreload && hasJsMatcher !== false
				? `${
						RuntimeGlobals.preloadChunkHandlers
					}.j = ${runtimeTemplate.basicFunction("chunkId", [
						// preload is a browser-only resource hint; no-op without a DOM (e.g. node side of a universal build)
						isNeutralPlatform
							? "if (typeof document === 'undefined') return;"
							: "",
						`if((!${
							RuntimeGlobals.hasOwnProperty
						}(installedChunks, chunkId) || installedChunks[chunkId] === undefined) && ${
							hasJsMatcher === true ? "true" : hasJsMatcher("chunkId")
						}) {`,
						Template.indent([
							// A hint is best-effort, so an id no url was written for is
							// skipped rather than turned into a bogus href.
							...(chunkUrls ? ["if(!chunkUrls[chunkId]) return;"] : []),
							"installedChunks[chunkId] = null;",
							linkPreload.call(
								Template.asString([
									`${cst} link = document.createElement('link');`,
									charset ? "link.charset = 'utf-8';" : "",
									`if (${RuntimeGlobals.scriptNonce}) {`,
									Template.indent(
										`link.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
									),
									"}",
									'link.rel = "modulepreload";',
									`link.href = ${chunkUrl("chunkId")};`,
									crossOriginLoading
										? crossOriginLoading === "use-credentials"
											? 'link.crossOrigin = "use-credentials";'
											: Template.asString([
													"if (link.href.indexOf(window.location.origin + '/') !== 0) {",
													Template.indent(
														`link.crossOrigin = ${JSON.stringify(
															crossOriginLoading
														)};`
													),
													"}"
												])
										: ""
								]),
								chunk
							),
							"document.head.appendChild(link);"
						]),
						"}"
					])};`
				: "// no preloaded",
			"",
			withExternalInstallChunk
				? Template.asString([
						`${RuntimeGlobals.externalInstallChunk} = installChunk;`
					])
				: "// no external install chunk",
			"",
			withAnalyzableImport
				? `${
						RuntimeGlobals.analyzableChunkImport
					} = ${runtimeTemplate.basicFunction("chunkId, importFn", [
						// `ensureChunk` with its `.j` half replaced by a literal `import()` a foreign
						// bundler can follow. The remaining handlers still run, so a chunk's css and
						// its prefetch/preload children are not lost by taking this path.
						`${lt} promises = [];`,
						`${lt} installedChunkData = ${RuntimeGlobals.hasOwnProperty}(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;`,
						'if(installedChunkData !== 0) { // 0 means "already installed".',
						Template.indent([
							'// a Promise means "currently loading".',
							"if(installedChunkData) {",
							Template.indent(["promises.push(installedChunkData[1]);"]),
							"} else {",
							Template.indent([
								`${lt} promise = importFn().then(installChunk, ${runtimeTemplate.basicFunction(
									"e",
									[
										"if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined;",
										"throw e;"
									]
								)});`,
								`promise = Promise.race([promise, new Promise(${runtimeTemplate.expressionFunction(
									"installedChunkData = installedChunks[chunkId] = [resolve]",
									"resolve"
								)})]);`,
								"promises.push((installedChunkData[1] = promise));"
							]),
							"}"
						]),
						"}",
						withLoading
							? `Object.keys(${fn}).forEach(${runtimeTemplate.basicFunction(
									"key",
									[`if(key !== "j") ${fn}[key](chunkId, promises);`]
								)});`
							: "// no other chunk loading handlers",
						"return Promise.all(promises);"
					])};`
				: "// no analyzable chunk import",
			"",
			withOnChunkLoad
				? `${
						RuntimeGlobals.onChunksLoaded
					}.j = ${runtimeTemplate.returningFunction(
						"installedChunks[chunkId] === 0",
						"chunkId"
					)};`
				: "// no on chunks loaded",
			withHmr
				? Template.asString([
						generateJavascriptHMR("module"),
						"",
						"function loadUpdateChunk(chunkId, updatedModulesList) {",
						Template.indent([
							`return new Promise(${runtimeTemplate.basicFunction(
								"resolve, reject",
								[
									"// start update chunk loading",
									`${cst} url = ${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkUpdateScriptFilename}(chunkId);`,
									`${cst} onResolve = ${runtimeTemplate.basicFunction("obj", [
										`${cst} updatedModules = obj.${RuntimeGlobals.esmModules};`,
										`${cst} updatedRuntime = obj.${RuntimeGlobals.esmRuntime};`,
										"if(updatedRuntime) currentUpdateRuntime.push(updatedRuntime);",
										"for(var moduleId in updatedModules) {",
										Template.indent([
											`if(${RuntimeGlobals.hasOwnProperty}(updatedModules, moduleId)) {`,
											Template.indent([
												"currentUpdate[moduleId] = updatedModules[moduleId];",
												`${runtimeTemplate.optionalChaining("updatedModulesList", "push(moduleId)")};`
											]),
											"}"
										]),
										"}",
										"resolve(obj);"
									])};`,
									`${cst} onReject = ${runtimeTemplate.basicFunction("error", [
										`${cst} errorMsg = error.message || 'unknown reason';`,
										"error.message = 'Loading hot update chunk ' + chunkId + ' failed.\\n(' + errorMsg + ')';",
										"error.name = 'ChunkLoadError';",
										"reject(error);"
									])}`,
									`${cst} loadScript = ${runtimeTemplate.basicFunction(
										"url, onResolve, onReject",
										[
											`return ${importFunctionName}(/* webpackIgnore: true */ url).then(onResolve).catch(onReject)`
										]
									)}`,
									"loadScript(url, onResolve, onReject);"
								]
							)});`
						]),
						"}",
						""
					])
				: "// no HMR",
			"",
			withHmrManifest
				? Template.asString([
						`${
							RuntimeGlobals.hmrDownloadManifest
						} = ${runtimeTemplate.basicFunction("", [
							`return ${importFunctionName}(/* webpackIgnore: true */ ${RuntimeGlobals.publicPath} + ${
								RuntimeGlobals.getUpdateManifestFilename
							}()).then(${runtimeTemplate.basicFunction("obj", [
								"return obj.default;"
							])}, ${runtimeTemplate.basicFunction("error", [
								"if(['MODULE_NOT_FOUND', 'ENOENT'].includes(error.code)) return;",
								"throw error;"
							])});`
						])};`
					])
				: "// no HMR manifest"
		]);
	}
}

ModuleChunkLoadingRuntimeModule.getCompilationHooks = createHooksRegistry(
	createCompilationHooks
);

module.exports = ModuleChunkLoadingRuntimeModule;
