/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
const Compilation = require("../Compilation");
const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const compileBooleanMatcher = require("../util/compileBooleanMatcher");
const { chunkHasCss } = require("./CssModulesPlugin");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compilation").RuntimeRequirementsContext} RuntimeRequirementsContext */
/** @typedef {import("../Module").ReadOnlyRuntimeRequirements} ReadOnlyRuntimeRequirements */

/**
 * @typedef {object} CssLoadingRuntimeModulePluginHooks
 * @property {SyncWaterfallHook<[string, Chunk]>} createStylesheet
 * @property {SyncWaterfallHook<[string, Chunk]>} linkPreload
 * @property {SyncWaterfallHook<[string, Chunk]>} linkPrefetch
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
				linkPrefetch: new SyncWaterfallHook(["source", "chunk"])
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

		this._runtimeRequirements = runtimeRequirements;
	}

	/**
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
				cssHeadDataCompression: withCompression
			}
		} = compilation;
		const fn = RuntimeGlobals.ensureChunkHandlers;
		const conditionMap = chunkGraph.getChunkConditionMap(
			/** @type {Chunk} */ (chunk),
			/**
			 * @param {Chunk} chunk the chunk
			 * @param {ChunkGraph} chunkGraph the chunk graph
			 * @returns {boolean} true, if the chunk has css
			 */
			(chunk, chunkGraph) =>
				Boolean(chunkGraph.getChunkModulesIterableBySourceType(chunk, "css"))
		);
		const hasCssMatcher = compileBooleanMatcher(conditionMap);

		const withLoading =
			_runtimeRequirements.has(RuntimeGlobals.ensureChunkHandlers) &&
			hasCssMatcher !== false;
		const withPrefetch = this._runtimeRequirements.has(
			RuntimeGlobals.prefetchChunkHandlers
		);
		const withPreload = this._runtimeRequirements.has(
			RuntimeGlobals.preloadChunkHandlers
		);
		/** @type {boolean} */
		const withHmr = _runtimeRequirements.has(
			RuntimeGlobals.hmrDownloadUpdateHandlers
		);
		/** @type {Set<number | string | null>} */
		const initialChunkIdsWithCss = new Set();
		/** @type {Set<number | string | null>} */
		const initialChunkIdsWithoutCss = new Set();
		for (const c of /** @type {Chunk} */ (chunk).getAllInitialChunks()) {
			(chunkHasCss(c, chunkGraph)
				? initialChunkIdsWithCss
				: initialChunkIdsWithoutCss
			).add(c.id);
		}

		if (!withLoading && !withHmr && initialChunkIdsWithCss.size === 0) {
			return null;
		}

		const { linkPreload, linkPrefetch } =
			CssLoadingRuntimeModule.getCompilationHooks(compilation);

		const withFetchPriority = _runtimeRequirements.has(
			RuntimeGlobals.hasFetchPriority
		);

		const { createStylesheet } =
			CssLoadingRuntimeModule.getCompilationHooks(compilation);

		const stateExpression = withHmr
			? `${RuntimeGlobals.hmrRuntimeStatePrefix}_css`
			: undefined;

		const code = Template.asString([
			"link = document.createElement('link');",
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

		/** @type {(str: string) => number} */
		const cc = str => str.charCodeAt(0);
		const name = uniqueName
			? runtimeTemplate.concatenation(
					"--webpack-",
					{ expr: "uniqueName" },
					"-",
					{ expr: "chunkId" }
				)
			: runtimeTemplate.concatenation("--webpack-", { expr: "chunkId" });

		return Template.asString([
			"// object to store loaded and loading chunks",
			"// undefined = chunk not loaded, null = chunk preloaded/prefetched",
			"// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded",
			`var installedChunks = ${
				stateExpression ? `${stateExpression} = ${stateExpression} || ` : ""
			}{${Array.from(
				initialChunkIdsWithoutCss,
				id => `${JSON.stringify(id)}:0`
			).join(",")}};`,
			"",
			uniqueName
				? `var uniqueName = ${JSON.stringify(
						runtimeTemplate.outputOptions.uniqueName
					)};`
				: "// data-webpack is not used as build has no uniqueName",
			`var loadCssChunkData = ${runtimeTemplate.basicFunction(
				"target, link, chunkId",
				[
					`var data, token = "", token2 = "", exports = {}, ${
						withHmr ? "moduleIds = [], " : ""
					}name = ${name}, i, cc = 1;`,
					"try {",
					Template.indent([
						"if(!link) link = loadStylesheet(chunkId);",
						// `link.sheet.rules` for legacy browsers
						"var cssRules = link.sheet.cssRules || link.sheet.rules;",
						"var j = cssRules.length - 1;",
						"while(j > -1 && !data) {",
						Template.indent([
							"var style = cssRules[j--].style;",
							"if(!style) continue;",
							"data = style.getPropertyValue(name);"
						]),
						"}"
					]),
					"}catch(e){}",
					"if(!data) {",
					Template.indent([
						"data = getComputedStyle(document.head).getPropertyValue(name);"
					]),
					"}",
					"if(!data) return [];",
					withCompression
						? Template.asString([
								// LZW decode
								`var map = {}, char = data[0], oldPhrase = char, decoded = char, code = 256, maxCode = ${"\uFFFF".charCodeAt(
									0
								)}, phrase;`,
								"for (i = 1; i < data.length; i++) {",
								Template.indent([
									"cc = data[i].charCodeAt(0);",
									"if (cc < 256) phrase = data[i]; else phrase = map[cc] ? map[cc] : (oldPhrase + char);",
									"decoded += phrase;",
									"char = phrase.charAt(0);",
									"map[code] = oldPhrase + char;",
									"if (++code > maxCode) { code = 256; map = {}; }",
									"oldPhrase = phrase;"
								]),
								"}",
								"data = decoded;"
							])
						: "// css head data compression is disabled",
					"for(i = 0; cc; i++) {",
					Template.indent([
						"cc = data.charCodeAt(i);",
						`if(cc == ${cc(":")}) { token2 = token; token = ""; }`,
						`else if(cc == ${cc(
							"/"
						)}) { token = token.replace(/^_/, ""); token2 = token2.replace(/^_/, ""); exports[token2] = token; token = ""; token2 = ""; }`,
						`else if(cc == ${cc("&")}) { ${
							RuntimeGlobals.makeNamespaceObject
						}(exports); }`,
						`else if(!cc || cc == ${cc(
							","
						)}) { token = token.replace(/^_/, ""); target[token] = (${runtimeTemplate.basicFunction(
							"exports, module",
							"module.exports = exports;"
						)}).bind(null, exports); ${
							withHmr ? "moduleIds.push(token); " : ""
						}token = ""; token2 = ""; exports = {};  }`,
						`else if(cc == ${cc("\\")}) { token += data[++i] }`,
						"else { token += data[i]; }"
					]),
					"}",
					`${
						withHmr ? `if(target == ${RuntimeGlobals.moduleFactories}) ` : ""
					}installedChunks[chunkId] = 0;`,
					withHmr ? "return moduleIds;" : ""
				]
			)}`,
			'var loadingAttribute = "data-webpack-loading";',
			`var loadStylesheet = ${runtimeTemplate.basicFunction(
				`chunkId, url, done${withHmr ? ", hmr" : ""}${
					withFetchPriority ? ", fetchPriority" : ""
				}`,
				[
					'var link, needAttach, key = "chunk-" + chunkId;',
					withHmr ? "if(!hmr) {" : "",
					'var links = document.getElementsByTagName("link");',
					"for(var i = 0; i < links.length; i++) {",
					Template.indent([
						"var l = links[i];",
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
					`var onLinkComplete = ${runtimeTemplate.basicFunction(
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
						`var timeout = setTimeout(onLinkComplete.bind(null, undefined, { type: 'timeout', target: link }), ${loadTimeout});`,
						"link.onerror = onLinkComplete.bind(null, link.onerror);",
						"link.onload = onLinkComplete.bind(null, link.onload);"
					]),
					"} else onLinkComplete(undefined, { type: 'load', target: link });", // We assume any existing stylesheet is render blocking
					withHmr ? "hmr ? document.head.insertBefore(link, hmr) :" : "",
					"needAttach && document.head.appendChild(link);",
					"return link;"
				]
			)};`,
			initialChunkIdsWithCss.size > 2
				? `${JSON.stringify(
						Array.from(initialChunkIdsWithCss)
					)}.forEach(loadCssChunkData.bind(null, ${
						RuntimeGlobals.moduleFactories
					}, 0));`
				: initialChunkIdsWithCss.size > 0
					? `${Array.from(
							initialChunkIdsWithCss,
							id =>
								`loadCssChunkData(${
									RuntimeGlobals.moduleFactories
								}, 0, ${JSON.stringify(id)});`
						).join("")}`
					: "// no initial css",
			"",
			withLoading
				? Template.asString([
						`${fn}.css = ${runtimeTemplate.basicFunction(
							`chunkId, promises${withFetchPriority ? " , fetchPriority" : ""}`,
							[
								"// css chunk loading",
								`var installedChunkData = ${RuntimeGlobals.hasOwnProperty}(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;`,
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
											`var promise = new Promise(${runtimeTemplate.expressionFunction(
												"installedChunkData = installedChunks[chunkId] = [resolve, reject]",
												"resolve, reject"
											)});`,
											"promises.push(installedChunkData[2] = promise);",
											"",
											"// start chunk loading",
											`var url = ${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkCssFilename}(chunkId);`,
											"// create error before stack unwound to get useful stacktrace later",
											"var error = new Error();",
											`var loadingEnded = ${runtimeTemplate.basicFunction(
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
																"var errorType = event && event.type;",
																"var realHref = event && event.target && event.target.href;",
																"error.message = 'Loading css chunk ' + chunkId + ' failed.\\n(' + errorType + ': ' + realHref + ')';",
																"error.name = 'ChunkLoadError';",
																"error.type = errorType;",
																"error.request = realHref;",
																"installedChunkData[1](error);"
															]),
															"} else {",
															Template.indent([
																`loadCssChunkData(${RuntimeGlobals.moduleFactories}, link, chunkId);`,
																"installedChunkData[0]();"
															]),
															"}"
														]),
														"}"
													]),
													"}"
												]
											)};`,
											`var link = loadStylesheet(chunkId, url, loadingEnded${
												withFetchPriority ? ", fetchPriority" : ""
											});`
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
							linkPrefetch.call(
								Template.asString([
									"var link = document.createElement('link');",
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
							linkPreload.call(
								Template.asString([
									"var link = document.createElement('link');",
									"link.charset = 'utf-8';",
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
						"var oldTags = [];",
						"var newTags = [];",
						`var applyHandler = ${runtimeTemplate.basicFunction("options", [
							`return { dispose: ${runtimeTemplate.basicFunction(
								"",
								[]
							)}, apply: ${runtimeTemplate.basicFunction("", [
								"var moduleIds = [];",
								`newTags.forEach(${runtimeTemplate.expressionFunction(
									"info[1].sheet.disabled = false",
									"info"
								)});`,
								"while(oldTags.length) {",
								Template.indent([
									"var oldTag = oldTags.pop();",
									"if(oldTag.parentNode) oldTag.parentNode.removeChild(oldTag);"
								]),
								"}",
								"while(newTags.length) {",
								Template.indent([
									"var info = newTags.pop();",
									`var chunkModuleIds = loadCssChunkData(${RuntimeGlobals.moduleFactories}, info[1], info[0]);`,
									`chunkModuleIds.forEach(${runtimeTemplate.expressionFunction(
										"moduleIds.push(id)",
										"id"
									)});`
								]),
								"}",
								"return moduleIds;"
							])} };`
						])}`,
						`var cssTextKey = ${runtimeTemplate.returningFunction(
							`Array.from(link.sheet.cssRules, ${runtimeTemplate.returningFunction(
								"r.cssText",
								"r"
							)}).join()`,
							"link"
						)}`,
						`${
							RuntimeGlobals.hmrDownloadUpdateHandlers
						}.css = ${runtimeTemplate.basicFunction(
							"chunkIds, removedChunks, removedModules, promises, applyHandlers, updatedModulesList",
							[
								"applyHandlers.push(applyHandler);",
								`chunkIds.forEach(${runtimeTemplate.basicFunction("chunkId", [
									`var filename = ${RuntimeGlobals.getChunkCssFilename}(chunkId);`,
									`var url = ${RuntimeGlobals.publicPath} + filename;`,
									"var oldTag = loadStylesheet(chunkId, url);",
									"if(!oldTag) return;",
									`promises.push(new Promise(${runtimeTemplate.basicFunction(
										"resolve, reject",
										[
											`var link = loadStylesheet(chunkId, url + (url.indexOf("?") < 0 ? "?" : "&") + "hmr=" + Date.now(), ${runtimeTemplate.basicFunction(
												"event",
												[
													'if(event.type !== "load") {',
													Template.indent([
														"var errorType = event && event.type;",
														"var realHref = event && event.target && event.target.href;",
														"error.message = 'Loading css hot update chunk ' + chunkId + ' failed.\\n(' + errorType + ': ' + realHref + ')';",
														"error.name = 'ChunkLoadError';",
														"error.type = errorType;",
														"error.request = realHref;",
														"reject(error);"
													]),
													"} else {",
													Template.indent([
														"try { if(cssTextKey(oldTag) == cssTextKey(link)) { if(link.parentNode) link.parentNode.removeChild(link); return resolve(); } } catch(e) {}",
														"var factories = {};",
														"loadCssChunkData(factories, link, chunkId);",
														`Object.keys(factories).forEach(${runtimeTemplate.expressionFunction(
															"updatedModulesList.push(id)",
															"id"
														)})`,
														"link.sheet.disabled = true;",
														"oldTags.push(oldTag);",
														"newTags.push([chunkId, link]);",
														"resolve();"
													]),
													"}"
												]
											)}, oldTag);`
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
