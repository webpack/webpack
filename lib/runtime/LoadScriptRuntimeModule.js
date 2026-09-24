/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
/** @import Compilation from "../Compilation" */
const Template = require("../template/Template");
const createHooksRegistry = require("../util/createHooksRegistry");
const HelperRuntimeModule = require("./HelperRuntimeModule");
const RuntimeGlobals = require("./RuntimeGlobals");

/** @import Chunk from "../graph/Chunk" */

/**
 * How `loadScript` loads: a script tag, `importScripts` or, where neither exists, not at all.
 * @typedef {"script" | "import-scripts" | "unavailable"} ScriptLoader
 */

/**
 * @typedef {object} LoadScriptCompilationHooks
 * @property {SyncWaterfallHook<[string, Chunk]>} createScript
 */

class LoadScriptRuntimeModule extends HelperRuntimeModule {
	/**
	 * @param {boolean=} withCreateScriptUrl use create script url for trusted types
	 * @param {boolean=} withFetchPriority use `fetchPriority` attribute
	 * @param {ScriptLoader=} loader how scripts are loaded, a script tag by default
	 */
	constructor(withCreateScriptUrl, withFetchPriority, loader = "script") {
		super("load script");
		/** @type {boolean | undefined} */
		this._withCreateScriptUrl = withCreateScriptUrl;
		/** @type {boolean | undefined} */
		this._withFetchPriority = withFetchPriority;
		/** @type {ScriptLoader} */
		this._loader = loader;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		if (this._loader === "import-scripts") return this._generateImportScripts();
		if (this._loader === "unavailable") return this._generateUnavailable();
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate, outputOptions } = compilation;
		const {
			scriptType,
			chunkLoadTimeout: loadTimeout,
			crossOriginLoading,
			uniqueName,
			charset
		} = outputOptions;
		const fn = RuntimeGlobals.loadScript;

		const { createScript } =
			LoadScriptRuntimeModule.getCompilationHooks(compilation);

		const code = Template.asString([
			"script = document.createElement('script');",
			scriptType ? `script.type = ${JSON.stringify(scriptType)};` : "",
			charset ? "script.charset = 'utf-8';" : "",
			`if (${RuntimeGlobals.scriptNonce}) {`,
			Template.indent(
				`script.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
			),
			"}",
			uniqueName
				? 'script.setAttribute("data-webpack", dataWebpackPrefix + key);'
				: "",
			this._withFetchPriority
				? Template.asString([
						"if(fetchPriority) {",
						Template.indent(
							'script.setAttribute("fetchpriority", fetchPriority);'
						),
						"}"
					])
				: "",
			`script.src = ${
				this._withCreateScriptUrl
					? `${RuntimeGlobals.createScriptUrl}(url)`
					: "url"
			};`,
			crossOriginLoading
				? crossOriginLoading === "use-credentials"
					? 'script.crossOrigin = "use-credentials";'
					: Template.asString([
							"if (script.src.indexOf(window.location.origin + '/') !== 0) {",
							Template.indent(
								`script.crossOrigin = ${JSON.stringify(crossOriginLoading)};`
							),
							"}"
						])
				: ""
		]);

		const cst = runtimeTemplate.renderConst();
		const lt = runtimeTemplate.renderLet();
		return Template.asString([
			`${cst} inProgress = {};`,
			uniqueName
				? `${cst} dataWebpackPrefix = ${JSON.stringify(`${uniqueName}:`)};`
				: "// data-webpack is not used as build has no uniqueName",
			"// loadScript function to load a script via script tag",
			`${fn} = ${runtimeTemplate.basicFunction(
				`url, done, key, chunkId${
					this._withFetchPriority ? ", fetchPriority" : ""
				}`,
				[
					"if(inProgress[url]) { inProgress[url].push(done); return; }",
					`${lt} script, needAttach;`,
					"if(key !== undefined) {",
					Template.indent([
						`${cst} scripts = document.getElementsByTagName("script");`,
						"for(var i = 0; i < scripts.length; i++) {",
						Template.indent([
							`${cst} s = scripts[i];`,
							`if(s.getAttribute("src") == url${
								uniqueName
									? ' || s.getAttribute("data-webpack") == dataWebpackPrefix + key'
									: ""
							}) { script = s; break; }`
						]),
						"}"
					]),
					"}",
					"if(!script) {",
					Template.indent([
						"needAttach = true;",
						createScript.call(code, /** @type {Chunk} */ (this.chunk))
					]),
					"}",
					"inProgress[url] = [done];",
					`${cst} onScriptComplete = ${runtimeTemplate.basicFunction(
						"prev, event",
						Template.asString([
							"// avoid mem leaks in IE.",
							"script.onerror = script.onload = null;",
							"clearTimeout(timeout);",
							`${cst} doneFns = inProgress[url];`,
							"delete inProgress[url];",
							`${runtimeTemplate.optionalChaining(
								"script.parentNode",
								"removeChild(script)"
							)};`,
							`${runtimeTemplate.optionalChaining(
								"doneFns",
								`forEach(${runtimeTemplate.returningFunction("fn(event)", "fn")})`
							)};`,
							"if(prev) return prev(event);"
						])
					)}`,
					`${cst} timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), ${loadTimeout});`,
					"script.onerror = onScriptComplete.bind(null, script.onerror);",
					"script.onload = onScriptComplete.bind(null, script.onload);",
					"needAttach && document.head.appendChild(script);"
				]
			)};`
		]);
	}

	/**
	 * Generates a `loadScript` that reports script-tag-like `load`/`error` events.
	 * @returns {string} runtime code
	 */
	_generateImportScripts() {
		const { runtimeTemplate } = /** @type {Compilation} */ (this.compilation);
		const url = this._withCreateScriptUrl
			? `${RuntimeGlobals.createScriptUrl}(url)`
			: "url";
		return Template.asString([
			"// loadScript function to load a script via importScripts",
			`${RuntimeGlobals.loadScript} = ${runtimeTemplate.basicFunction(
				"url, done",
				[
					`${runtimeTemplate.renderConst()} event = { type: "load", target: { src: url } };`,
					`try { importScripts(${url}); } catch (_) { event.type = "error"; }`,
					"done(event);"
				]
			)};`
		]);
	}

	/**
	 * Generates a `loadScript` that throws, for a worker with neither `document` nor `importScripts`.
	 * @returns {string} runtime code
	 */
	_generateUnavailable() {
		const { runtimeTemplate } = /** @type {Compilation} */ (this.compilation);
		return Template.asString([
			"// loadScript is unavailable: this worker has no document and no importScripts",
			`${RuntimeGlobals.loadScript} = ${runtimeTemplate.basicFunction("url", [
				`throw new Error(${JSON.stringify("Loading script ")} + url + ${JSON.stringify(
					' failed: this worker has neither document nor importScripts, use the "module" or "import" external type instead'
				)});`
			])};`
		]);
	}
}

LoadScriptRuntimeModule.getCompilationHooks = createHooksRegistry(
	() =>
		/** @type {LoadScriptCompilationHooks} */ ({
			createScript: new SyncWaterfallHook(["source", "chunk"])
		})
);

module.exports = LoadScriptRuntimeModule;
