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
const { getInitialChunkIds } = require("../javascript/StartupHelpers");
const compileBooleanMatcher = require("../util/compileBooleanMatcher");

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

		if (!withLoading && !withHmr) {
			return null;
		}

		const { createStylesheet } =
			CssLoadingRuntimeModule.getCompilationHooks(compilation);

		const initialChunkIds = getInitialChunkIds(chunk, chunkGraph);
		const stateExpression = withHmr
			? `${RuntimeGlobals.hmrRuntimeStatePrefix}_css`
			: undefined;

		const code = Template.asString([
			"link = document.createElement('link');",
			uniqueName
				? 'link.setAttribute("data-webpack", dataWebpackPrefix + key);'
				: "",
			"link.setAttribute(loadingAttribute, 1);",
			'link.rel = "stylesheet";',
			withHmr ? 'if(hmr) link.media = "print and screen";' : "",
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

		return Template.asString([
			"// object to store loaded and loading chunks",
			"// undefined = chunk not loaded, null = chunk preloaded/prefetched",
			"// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded",
			`var installedChunks = ${
				stateExpression ? `${stateExpression} = ${stateExpression} || ` : ""
			}{};`,
			"",
			`var loadCssChunkData = ${runtimeTemplate.basicFunction("chunkId, link", [
				'var data, tokens = [], token = "", i = 0;',
				"try { if(!link) link = loadStylesheet(chunkId); data = link.sheet.cssRules; data = data[data.length - 1].style; } catch(e) { data = getComputedStyle(document.head); }",
				'data = data.getPropertyValue("--webpack-" + chunkId);',
				"for(; i < data.length; i++) {",
				Template.indent([
					"var cc = data.charCodeAt(i);",
					'if(cc == 32) { tokens.push(token); token = ""; }',
					"else if(cc == 92) { token += data[++i] }",
					"else { token += data[i]; }"
				]),
				"}",
				"token && tokens.push(token);",
				`tokens.forEach(${runtimeTemplate.basicFunction("token", [
					`${
						RuntimeGlobals.moduleFactories
					}[token.slice(1)] = ${runtimeTemplate.basicFunction(
						"module, exports",
						[`${RuntimeGlobals.makeNamespaceObject}(exports);`]
					)};`
				])});`,
				"installedChunks[chunkId] = 0;"
			])}`,
			'var loadingAttribute = "data-webpack-loading";',
			uniqueName
				? `var dataWebpackPrefix = ${JSON.stringify(uniqueName + ":")};`
				: "// data-webpack is not used as build has no uniqueName",
			`var loadStylesheet = ${runtimeTemplate.basicFunction(
				"chunkId, url, done" + (withHmr ? ", hmr" : ""),
				[
					'var link, needAttach, key = "chunk-" + chunkId;',
					withHmr ? "if(!hmr) {" : "",
					'var links = document.getElementsByTagName("link");',
					"for(var i = 0; i < links.length; i++) {",
					Template.indent([
						"var l = links[i];",
						`if(l.getAttribute("href") == url${
							uniqueName
								? ' || l.getAttribute("data-webpack") == dataWebpackPrefix + key'
								: ""
						}) { link = l; break; }`
					]),
					"}",
					"if(!url) return link;",
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
					"needAttach && document.head.appendChild(link);",
					"return link;"
				]
			)};`,
			initialChunkIds.size > 5
				? `${JSON.stringify(
						Array.from(initialChunkIds)
				  )}.forEach(loadCssChunkData);`
				: initialChunkIds.size > 0
				? `${Array.from(
						initialChunkIds,
						id => `loadCssChunkData(${JSON.stringify(id)});`
				  ).join("")}`
				: "// no initial css",
			"",
			withLoading
				? Template.asString([
						`${fn}.css = ${runtimeTemplate.basicFunction(
							"chunkId, promises",
							hasCssMatcher !== false
								? [
										"// css chunk loading",
										`var installedChunkData = ${RuntimeGlobals.hasOwnProperty}(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;`,
										'if(installedChunkData !== 0) { // 0 means "already installed".',
										Template.indent([
											"",
											'// a Promise means "currently loading".',
											"if(installedChunkData) {",
											Template.indent([
												"promises.push(installedChunkData[2]);"
											]),
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
																		"loadCssChunkData(chunkId, link);",
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
								  ]
								: "installedChunks[chunkId] = 0;"
						)};`
				  ])
				: "// no chunk loading",
			"",
			withHmr
				? Template.asString([
						"var oldTags = [];",
						"var newTags = [];",
						`var applyHandler = ${runtimeTemplate.basicFunction("options", [
							`return { dispose: ${runtimeTemplate.basicFunction("", [
								"while(oldTags.length) {",
								Template.indent([
									"var oldTag = oldTags.pop();",
									"if(oldTag.parentNode) oldTag.parentNode.removeChild(oldTag);"
								]),
								"}"
							])}, apply: ${runtimeTemplate.basicFunction("", [
								'while(newTags.length) { var info = newTags.pop(); info[1].media = "all"; loadCssChunkData(info[0], info[1]); }'
							])} };`
						])}`,
						`${
							RuntimeGlobals.hmrDownloadUpdateHandlers
						}.css = ${runtimeTemplate.basicFunction(
							"chunkIds, removedChunks, removedModules, promises, applyHandlers, updatedModulesList",
							[
								"applyHandlers.push(applyHandler);",
								`chunkIds.forEach(${runtimeTemplate.basicFunction("chunkId", [
									"var oldTag = loadStylesheet(chunkId);",
									"if(!oldTag) return;",
									`var filename = ${RuntimeGlobals.getChunkCssFilename}(chunkId);`,
									`var url = ${RuntimeGlobals.publicPath} + filename;`,
									`promises.push(new Promise(${runtimeTemplate.basicFunction(
										"resolve, reject",
										[
											`var link = loadStylesheet(chunkId, url, ${runtimeTemplate.basicFunction(
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
													"} else resolve();"
												]
											)}, true);`,
											"oldTags.push(oldTag);",
											"newTags.push([chunkId, link]);"
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
