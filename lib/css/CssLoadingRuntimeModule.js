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

/**
 * @typedef {Object} JsonpCompilationPluginHooks
 * @property {SyncWaterfallHook<[string, Chunk]>} createStylesheet
 */

/** @type {WeakMap<Compilation, JsonpCompilationPluginHooks>} */
const compilationHooksMap = new WeakMap();

class CssLoadingRuntimeModule extends RuntimeModule {
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
				createStylesheet: new SyncWaterfallHook(["source", "chunk"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	constructor(runtimeRequirements, runtimeOptions) {
		super("css loading", 10);

		this._runtimeRequirements = runtimeRequirements;
		this.runtimeOptions = runtimeOptions;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { compilation, chunk, _runtimeRequirements } = this;
		const {
			chunkGraph,
			runtimeTemplate,
			outputOptions: {
				crossOriginLoading,
				uniqueName,
				chunkLoadTimeout: loadTimeout
			}
		} = compilation;
		const fn = RuntimeGlobals.ensureChunkHandlers;
		const conditionMap = chunkGraph.getChunkConditionMap(
			chunk,
			(chunk, chunkGraph) =>
				!!chunkGraph.getChunkModulesIterableBySourceType(chunk, "css")
		);
		const hasCssMatcher = compileBooleanMatcher(conditionMap);

		const withLoading =
			_runtimeRequirements.has(RuntimeGlobals.ensureChunkHandlers) &&
			hasCssMatcher !== false;
		const withHmr = _runtimeRequirements.has(
			RuntimeGlobals.hmrDownloadUpdateHandlers
		);
		const initialChunkIdsWithCss = new Set();
		const initialChunkIdsWithoutCss = new Set();
		for (const c of chunk.getAllInitialChunks()) {
			(chunkHasCss(c, chunkGraph)
				? initialChunkIdsWithCss
				: initialChunkIdsWithoutCss
			).add(c.id);
		}

		if (!withLoading && !withHmr && initialChunkIdsWithCss.size === 0) {
			return null;
		}

		const { createStylesheet } =
			CssLoadingRuntimeModule.getCompilationHooks(compilation);

		const stateExpression = withHmr
			? `${RuntimeGlobals.hmrRuntimeStatePrefix}_css`
			: undefined;

		const code = Template.asString([
			"link = document.createElement('link');",
			uniqueName
				? 'link.setAttribute("data-webpack", uniqueName + ":" + key);'
				: "",
			"link.setAttribute(loadingAttribute, 1);",
			'link.rel = "stylesheet";',
			"link.href = url;",
			crossOriginLoading
				? Template.asString([
						"if (link.src.indexOf(window.location.origin + '/') !== 0) {",
						Template.indent(
							`link.crossOrigin = ${JSON.stringify(crossOriginLoading)};`
						),
						"}"
				  ])
				: ""
		]);

		const cc = str => str.charCodeAt(0);

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
					`var data, token = "", token2, exports = {}, exportsWithId = [], exportsWithDashes = [], ${
						withHmr ? "moduleIds = [], " : ""
					}i = 0, cc = 1;`,
					"try { if(!link) link = loadStylesheet(chunkId); data = link.sheet.cssRules; data = data[data.length - 1].style; } catch(e) { data = getComputedStyle(document.head); }",
					`data = data.getPropertyValue(${
						uniqueName
							? runtimeTemplate.concatenation(
									"--webpack-",
									{ expr: "uniqueName" },
									"-",
									{ expr: "chunkId" }
							  )
							: runtimeTemplate.concatenation("--webpack-", { expr: "chunkId" })
					});`,
					"if(!data) return [];",
					"for(; cc; i++) {",
					Template.indent([
						"cc = data.charCodeAt(i);",
						`if(cc == ${cc("(")}) { token2 = token; token = ""; }`,
						`else if(cc == ${cc(
							")"
						)}) { exports[token2.replace(/^_/, "")] = token.replace(/^_/, ""); token = ""; }`,
						`else if(cc == ${cc("/")} || cc == ${cc(
							"%"
						)}) { token = token.replace(/^_/, ""); exports[token] = token; exportsWithId.push(token); if(cc == ${cc(
							"%"
						)}) exportsWithDashes.push(token); token = ""; }`,
						`else if(!cc || cc == ${cc(
							","
						)}) { token = token.replace(/^_/, ""); exportsWithId.forEach(${runtimeTemplate.expressionFunction(
							`exports[x] = ${
								uniqueName
									? runtimeTemplate.concatenation(
											{ expr: "uniqueName" },
											"-",
											{ expr: "token" },
											"-",
											{ expr: "exports[x]" }
									  )
									: runtimeTemplate.concatenation({ expr: "token" }, "-", {
											expr: "exports[x]"
									  })
							}`,
							"x"
						)}); exportsWithDashes.forEach(${runtimeTemplate.expressionFunction(
							`exports[x] = "--" + exports[x]`,
							"x"
						)}); ${
							RuntimeGlobals.makeNamespaceObject
						}(exports); target[token] = (${runtimeTemplate.basicFunction(
							"exports, module",
							`module.exports = exports;`
						)}).bind(null, exports); ${
							withHmr ? "moduleIds.push(token); " : ""
						}token = ""; exports = {}; exportsWithId.length = 0; }`,
						`else if(cc == ${cc("\\")}) { token += data[++i] }`,
						`else { token += data[i]; }`
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
				"chunkId, url, done" + (withHmr ? ", hmr" : ""),
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
						createStylesheet.call(code, this.chunk)
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
						`${fn}.css = ${runtimeTemplate.basicFunction("chunkId, promises", [
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
											`installedChunkData = installedChunks[chunkId] = [resolve, reject]`,
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
															"var realSrc = event && event.target && event.target.src;",
															"error.message = 'Loading css chunk ' + chunkId + ' failed.\\n(' + errorType + ': ' + realSrc + ')';",
															"error.name = 'ChunkLoadError';",
															"error.type = errorType;",
															"error.request = realSrc;",
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
										"var link = loadStylesheet(chunkId, url, loadingEnded);"
									]),
									"} else installedChunks[chunkId] = 0;"
								]),
								"}"
							]),
							"}"
						])};`
				  ])
				: "// no chunk loading",
			"",
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
									`var info = newTags.pop();`,
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
														"var realSrc = event && event.target && event.target.src;",
														"error.message = 'Loading css hot update chunk ' + chunkId + ' failed.\\n(' + errorType + ': ' + realSrc + ')';",
														"error.name = 'ChunkLoadError';",
														"error.type = errorType;",
														"error.request = realSrc;",
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
