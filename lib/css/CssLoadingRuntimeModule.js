/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
const Compilation = require("../Compilation");
const { CSS_TYPE } = require("../ModuleSourceTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const compileBooleanMatcher = require("../util/compileBooleanMatcher");
const { chunkHasCss } = require("./CssModulesPlugin");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Chunk").ChunkId} ChunkId */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Module").ReadOnlyRuntimeRequirements} ReadOnlyRuntimeRequirements */

/**
 * @typedef {object} CssLoadingRuntimeModulePluginHooks
 * @property {SyncWaterfallHook<[string, Chunk]>} createStylesheet
 * @property {SyncWaterfallHook<[string, Chunk]>} linkPreload
 * @property {SyncWaterfallHook<[string, Chunk]>} linkPrefetch
 * @property {SyncWaterfallHook<[string, Chunk]>} linkInsert
 */

/** @type {WeakMap<Compilation, CssLoadingRuntimeModulePluginHooks>} */
const compilationHooksMap = new WeakMap();

class CssLoadingRuntimeModule extends RuntimeModule {
	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {CssLoadingRuntimeModulePluginHooks} hooks
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
				createStylesheet: new SyncWaterfallHook(["source", "chunk"]),
				linkPreload: new SyncWaterfallHook(["source", "chunk"]),
				linkPrefetch: new SyncWaterfallHook(["source", "chunk"]),
				linkInsert: new SyncWaterfallHook(["source", "chunk"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	/**
	 * @param {ReadOnlyRuntimeRequirements} runtimeRequirements runtime requirements
	 */
	constructor(runtimeRequirements) {
		super("css loading", 10);

		/** @type {ReadOnlyRuntimeRequirements} */
		this._runtimeRequirements = runtimeRequirements;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { _runtimeRequirements } = this;
		const compilation = /** @type {Compilation} */ (this.compilation);
		const chunk = /** @type {Chunk} */ (this.chunk);
		const {
			chunkGraph,
			runtimeTemplate,
			outputOptions: {
				crossOriginLoading,
				uniqueName,
				chunkLoadTimeout: loadTimeout,
				charset,
				importMetaName
			}
		} = compilation;
		const fn = RuntimeGlobals.ensureChunkHandlers;
		const conditionMap = chunkGraph.getChunkConditionMap(
			chunk,
			/**
			 * @param {Chunk} chunk the chunk
			 * @param {ChunkGraph} chunkGraph the chunk graph
			 * @returns {boolean} true, if the chunk has css
			 */
			(chunk, chunkGraph) =>
				Boolean(chunkGraph.getChunkModulesIterableBySourceType(chunk, CSS_TYPE))
		);
		const hasCssMatcher = compileBooleanMatcher(conditionMap);

		const withLoading =
			_runtimeRequirements.has(RuntimeGlobals.ensureChunkHandlers) &&
			hasCssMatcher !== false;
		/** @type {boolean} */
		const withHmr = _runtimeRequirements.has(
			RuntimeGlobals.hmrDownloadUpdateHandlers
		);
		/** @type {Set<ChunkId>} */
		const initialChunkIds = new Set();
		for (const c of chunk.getAllInitialChunks()) {
			if (chunkHasCss(c, chunkGraph)) {
				initialChunkIds.add(/** @type {ChunkId} */ (c.id));
			}
		}

		if (!withLoading && !withHmr) {
			return null;
		}

		const environment = compilation.outputOptions.environment;
		const isNeutralPlatform = runtimeTemplate.isNeutralPlatform();
		const withPrefetch =
			this._runtimeRequirements.has(RuntimeGlobals.prefetchChunkHandlers) &&
			(environment.document || isNeutralPlatform) &&
			chunk.hasChildByOrder(chunkGraph, "prefetch", true, chunkHasCss);
		const withPreload =
			this._runtimeRequirements.has(RuntimeGlobals.preloadChunkHandlers) &&
			(environment.document || isNeutralPlatform) &&
			chunk.hasChildByOrder(chunkGraph, "preload", true, chunkHasCss);

		const { linkPreload, linkPrefetch, createStylesheet, linkInsert } =
			CssLoadingRuntimeModule.getCompilationHooks(compilation);

		const withFetchPriority = _runtimeRequirements.has(
			RuntimeGlobals.hasFetchPriority
		);

		const stateExpression = withHmr
			? `${RuntimeGlobals.hmrRuntimeStatePrefix}_css`
			: undefined;

		const code = Template.asString([
			"link = document.createElement('link');",
			charset ? "link.charset = 'utf-8';" : "",
			`if (${RuntimeGlobals.scriptNonce}) {`,
			Template.indent(
				`link.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
			),
			"}",
			uniqueName
				? 'link.setAttribute("data-webpack", uniqueName + ":" + key);'
				: "",
			withFetchPriority
				? Template.asString([
						"if(fetchPriority) {",
						Template.indent(
							'link.setAttribute("fetchpriority", fetchPriority);'
						),
						"}"
					])
				: "",
			"link.setAttribute(loadingAttribute, 1);",
			'link.rel = "stylesheet";',
			"link.href = url;",
			crossOriginLoading
				? crossOriginLoading === "use-credentials"
					? 'link.crossOrigin = "use-credentials";'
					: Template.asString([
							"if (link.href.indexOf(window.location.origin + '/') !== 0) {",
							Template.indent(
								`link.crossOrigin = ${JSON.stringify(crossOriginLoading)};`
							),
							"}"
						])
				: ""
		]);

		const cst = runtimeTemplate.renderConst();
		const lt = runtimeTemplate.renderLet();
		const installedChunksObject = `{\n${Template.indent(
			Array.from(initialChunkIds, (id) => `${JSON.stringify(id)}: 0`).join(
				",\n"
			)
		)}\n}`;
		return Template.asString([
			"// object to store loaded and loading chunks",
			"// undefined = chunk not loaded, null = chunk preloaded/prefetched",
			"// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded",
			`${cst} installedChunks = ${
				stateExpression
					? runtimeTemplate.assignOr(stateExpression, installedChunksObject)
					: installedChunksObject
			};`,
			"",
			uniqueName
				? `${cst} uniqueName = ${JSON.stringify(
						runtimeTemplate.outputOptions.uniqueName
					)};`
				: "// data-webpack is not used as build has no uniqueName",
			withLoading || withHmr
				? Template.asString([
						`${cst} loadingAttribute = "data-webpack-loading";`,
						`${cst} loadStylesheet = ${runtimeTemplate.basicFunction(
							`chunkId, url, done${
								withFetchPriority ? ", fetchPriority" : ""
							}${withHmr ? ", hmr" : ""}`,
							[
								`${lt} link, needAttach, key = "chunk-" + chunkId;`,
								withHmr ? "if(!hmr) {" : "",
								`${cst} links = document.getElementsByTagName("link");`,
								"for(var i = 0; i < links.length; i++) {",
								Template.indent([
									`${cst} l = links[i];`,
									`if(l.rel == "stylesheet" && (${
										withHmr
											? 'l.href.startsWith(url) || l.getAttribute("href").startsWith(url)'
											: 'l.href == url || l.getAttribute("href") == url'
									}${
										uniqueName
											? ' || l.getAttribute("data-webpack") == uniqueName + ":" + key'
											: ""
									})) { link = l; break; }`
								]),
								"}",
								"if(!done) return link;",
								withHmr ? "}" : "",
								"if(!link) {",
								Template.indent([
									"needAttach = true;",
									createStylesheet.call(code, /** @type {Chunk} */ (this.chunk))
								]),
								"}",
								`${lt} timeout;`,
								`${cst} onLinkComplete = ${runtimeTemplate.basicFunction(
									"prev, event",
									Template.asString([
										"link.onerror = link.onload = null;",
										"link.removeAttribute(loadingAttribute);",
										"clearTimeout(timeout);",
										'if(event && event.type != "load") link.parentNode.removeChild(link)',
										"done(event);",
										"if(prev) return prev(event);"
									])
								)};`,
								"if(link.getAttribute(loadingAttribute)) {",
								Template.indent([
									`timeout = setTimeout(onLinkComplete.bind(null, undefined, { type: 'timeout', target: link }), ${loadTimeout});`,
									"link.onerror = onLinkComplete.bind(null, link.onerror);",
									"link.onload = onLinkComplete.bind(null, link.onload);"
								]),
								"} else onLinkComplete(undefined, { type: 'load', target: link });", // We assume any existing stylesheet is render blocking
								withHmr && withFetchPriority
									? 'if (hmr && hmr.getAttribute("fetchpriority")) link.setAttribute("fetchpriority", hmr.getAttribute("fetchpriority"));'
									: "",
								linkInsert.call(
									withHmr
										? Template.asString([
												"if (hmr) {",
												Template.indent(
													"hmr.parentNode.insertBefore(link, hmr);"
												),
												"} else if (needAttach) {",
												Template.indent("document.head.appendChild(link);"),
												"}"
											])
										: Template.asString([
												"if (needAttach) {",
												Template.indent("document.head.appendChild(link);"),
												"}"
											]),
									/** @type {Chunk} */ (this.chunk)
								),
								"return link;"
							]
						)};`
					])
				: "",
			withLoading
				? Template.asString([
						`${fn}.css = ${runtimeTemplate.basicFunction(
							`chunkId, promises${withFetchPriority ? " , fetchPriority" : ""}`,
							[
								"// css chunk loading",
								`${lt} installedChunkData = ${RuntimeGlobals.hasOwnProperty}(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;`,
								'if(installedChunkData !== 0) { // 0 means "already installed".',
								Template.indent([
									"",
									'// a Promise means "currently loading".',
									"if(installedChunkData) {",
									Template.indent(["promises.push(installedChunkData[2]);"]),
									"} else {",
									Template.indent([
										hasCssMatcher === true
											? "if(true) { // all chunks have CSS"
											: `if(${hasCssMatcher("chunkId")}) {`,
										Template.indent([
											"// setup Promise in chunk cache",
											`${cst} promise = new Promise(${runtimeTemplate.expressionFunction(
												"installedChunkData = installedChunks[chunkId] = [resolve, reject]",
												"resolve, reject"
											)});`,
											"promises.push(installedChunkData[2] = promise);",
											"",
											"// start chunk loading",
											`${cst} url = ${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkCssFilename}(chunkId);`,
											"// create error before stack unwound to get useful stacktrace later",
											`${cst} error = new Error();`,
											`${cst} loadingEnded = ${runtimeTemplate.basicFunction(
												"event",
												[
													`if(${RuntimeGlobals.hasOwnProperty}(installedChunks, chunkId)) {`,
													Template.indent([
														"installedChunkData = installedChunks[chunkId];",
														"if(installedChunkData !== 0) installedChunks[chunkId] = undefined;",
														"if(installedChunkData) {",
														Template.indent([
															'if(event.type !== "load") {',
															Template.indent([
																`${cst} errorType = event && event.type;`,
																`${cst} realHref = event && event.target && event.target.href;`,
																"error.message = 'Loading css chunk ' + chunkId + ' failed.\\n(' + errorType + ': ' + realHref + ')';",
																"error.name = 'ChunkLoadError';",
																"error.type = errorType;",
																"error.request = realHref;",
																"installedChunkData[1](error);"
															]),
															"} else {",
															Template.indent([
																"installedChunks[chunkId] = 0;",
																"installedChunkData[0]();"
															]),
															"}"
														]),
														"}"
													]),
													"}"
												]
											)};`,
											isNeutralPlatform
												? "if (typeof document !== 'undefined') {"
												: "",
											Template.indent([
												`loadStylesheet(chunkId, url, loadingEnded${
													withFetchPriority ? ", fetchPriority" : ""
												});`
											]),
											isNeutralPlatform
												? Template.asString([
														"} else {",
														Template.indent([
															// no DOM (Node SSR): read the emitted CSS via dynamic import('fs') (works on every node), collect it; never reject on a missing file
															`Promise.all([import('fs'), import('url')]).then(${runtimeTemplate.basicFunction(
																"[{ readFile }, { URL }]",
																[
																	`readFile(new URL(url, ${importMetaName}.url), 'utf8', ${runtimeTemplate.basicFunction(
																		"err, content",
																		[
																			`if (!err) ${runtimeTemplate.cssServerStyleRegistry()}["chunk-" + chunkId] = content;`,
																			"loadingEnded({ type: 'load' });"
																		]
																	)});`
																]
															)});`
														]),
														"}"
													])
												: ""
										]),
										"} else installedChunks[chunkId] = 0;"
									]),
									"}"
								]),
								"}"
							]
						)};`
					])
				: "// no chunk loading",
			"",
			withPrefetch && hasCssMatcher !== false
				? `${
						RuntimeGlobals.prefetchChunkHandlers
					}.s = ${runtimeTemplate.basicFunction("chunkId", [
						`if((!${
							RuntimeGlobals.hasOwnProperty
						}(installedChunks, chunkId) || installedChunks[chunkId] === undefined) && ${
							hasCssMatcher === true ? "true" : hasCssMatcher("chunkId")
						}) {`,
						Template.indent([
							"installedChunks[chunkId] = null;",
							// prefetch is a browser-only resource hint; no-op without a DOM (e.g. node side of a universal build)
							isNeutralPlatform
								? "if (typeof document === 'undefined') return;"
								: "",
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
									'link.as = "style";',
									`link.href = ${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkCssFilename}(chunkId);`
								]),
								chunk
							),
							"document.head.appendChild(link);"
						]),
						"}"
					])};`
				: "// no prefetching",
			"",
			withPreload && hasCssMatcher !== false
				? `${
						RuntimeGlobals.preloadChunkHandlers
					}.s = ${runtimeTemplate.basicFunction("chunkId", [
						`if((!${
							RuntimeGlobals.hasOwnProperty
						}(installedChunks, chunkId) || installedChunks[chunkId] === undefined) && ${
							hasCssMatcher === true ? "true" : hasCssMatcher("chunkId")
						}) {`,
						Template.indent([
							"installedChunks[chunkId] = null;",
							// preload is a browser-only resource hint; no-op without a DOM (e.g. node side of a universal build)
							isNeutralPlatform
								? "if (typeof document === 'undefined') return;"
								: "",
							linkPreload.call(
								Template.asString([
									`${cst} link = document.createElement('link');`,
									charset ? "link.charset = 'utf-8';" : "",
									`if (${RuntimeGlobals.scriptNonce}) {`,
									Template.indent(
										`link.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
									),
									"}",
									'link.rel = "preload";',
									'link.as = "style";',
									`link.href = ${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkCssFilename}(chunkId);`,
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
			withHmr
				? Template.asString([
						`${cst} oldTags = [];`,
						`${cst} newTags = [];`,
						`${cst} applyHandler = ${runtimeTemplate.basicFunction("options", [
							`return { ${runtimeTemplate.method("dispose", "", [
								"while(oldTags.length) {",
								Template.indent([
									`${cst} oldTag = oldTags.pop();`,
									`if(${runtimeTemplate.optionalChaining("oldTag", "parentNode")}) oldTag.parentNode.removeChild(oldTag);`
								]),
								"}"
							])}, ${runtimeTemplate.method("apply", "", [
								"while(newTags.length) {",
								Template.indent([
									`${cst} newTag = newTags.pop();`,
									"newTag.sheet.disabled = false"
								]),
								"}"
							])} };`
						])}`,
						`${cst} cssTextKey = ${runtimeTemplate.returningFunction(
							`Array.from(link.sheet.cssRules, ${runtimeTemplate.returningFunction(
								"r.cssText",
								"r"
							)}).join()`,
							"link"
						)};`,
						`${
							RuntimeGlobals.hmrDownloadUpdateHandlers
						}.css = ${runtimeTemplate.basicFunction(
							"chunkIds, removedChunks, removedModules, promises, applyHandlers, updatedModulesList, css",
							[
								isNeutralPlatform
									? Template.asString([
											"if (typeof document === 'undefined') {",
											Template.indent([
												// node SSR: refresh the server style registry from the re-emitted CSS instead of touching the DOM
												`${cst} cssRemovedChunks = css && css.r;`,
												`${cst} registry = ${runtimeTemplate.cssServerStyleRegistry()};`,
												`chunkIds.forEach(${runtimeTemplate.basicFunction(
													"chunkId",
													[
														`${cst} key = "chunk-" + chunkId;`,
														`if(${runtimeTemplate.optionalChaining(
															"cssRemovedChunks",
															"indexOf(chunkId)"
														)} >= 0) { delete registry[key]; return; }`,
														`${cst} url = ${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkCssFilename}(chunkId);`,
														`promises.push(Promise.all([import('fs'), import('url')]).then(${runtimeTemplate.basicFunction(
															"[{ readFile }, { URL }]",
															[
																`return new Promise(${runtimeTemplate.basicFunction(
																	"resolve",
																	[
																		// best-effort: a non-file publicPath (e.g. a CDN) can't be read from disk, so skip
																		"try {",
																		Template.indent([
																			`readFile(new URL(url, ${importMetaName}.url), 'utf8', ${runtimeTemplate.basicFunction(
																				"err, content",
																				[
																					"if (!err) registry[key] = content;",
																					"resolve();"
																				]
																			)});`
																		]),
																		"} catch (e) { resolve(); }"
																	]
																)});`
															]
														)}));`
													]
												)});`,
												"return;"
											]),
											"}"
										])
									: "",
								"applyHandlers.push(applyHandler);",
								"// Read CSS removed chunks from update manifest",
								`${cst} cssRemovedChunks = css && css.r;`,
								`chunkIds.forEach(${runtimeTemplate.basicFunction("chunkId", [
									`${cst} filename = ${RuntimeGlobals.getChunkCssFilename}(chunkId);`,
									`${cst} url = ${RuntimeGlobals.publicPath} + filename;`,
									`${cst} oldTag = loadStylesheet(chunkId, url);`,
									`if(!oldTag && !${withHmr} ) return;`,
									"// Skip if CSS was removed",
									`if(${runtimeTemplate.optionalChaining(
										"cssRemovedChunks",
										"indexOf(chunkId)"
									)} >= 0) {`,
									Template.indent(["oldTags.push(oldTag);", "return;"]),
									"}",
									"",
									"// create error before stack unwound to get useful stacktrace later",
									`${cst} error = new Error();`,
									`promises.push(new Promise(${runtimeTemplate.basicFunction(
										"resolve, reject",
										[
											`${cst} link = loadStylesheet(chunkId, url + (url.indexOf("?") < 0 ? "?" : "&") + "hmr=" + Date.now(), ${runtimeTemplate.basicFunction(
												"event",
												[
													'if(event.type !== "load") {',
													Template.indent([
														`${cst} errorType = event && event.type;`,
														`${cst} realHref = event && event.target && event.target.href;`,
														"error.message = 'Loading css hot update chunk ' + chunkId + ' failed.\\n(' + errorType + ': ' + realHref + ')';",
														"error.name = 'ChunkLoadError';",
														"error.type = errorType;",
														"error.request = realHref;",
														"reject(error);"
													]),
													"} else {",
													Template.indent([
														"try { if(cssTextKey(oldTag) == cssTextKey(link)) { if(link.parentNode) link.parentNode.removeChild(link); return resolve(); } } catch(e) {}",
														"link.sheet.disabled = true;",
														"oldTags.push(oldTag);",
														"newTags.push(link);",
														"resolve();"
													]),
													"}"
												]
											)}, ${withFetchPriority ? "undefined," : ""} oldTag);`
										]
									)}));`
								])});`
							]
						)}`
					])
				: "// no hmr"
		]);
	}
}

module.exports = CssLoadingRuntimeModule;
