/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
const Compilation = require("../Compilation");
const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Module").ReadOnlyRuntimeRequirements} ReadOnlyRuntimeRequirements */

/**
 * @typedef {object} CssInjectCompilationHooks
 * @property {SyncWaterfallHook<[string, Chunk]>} createStyle
 */

/** @type {WeakMap<Compilation, CssInjectCompilationHooks>} */
const compilationHooksMap = new WeakMap();

class CssInjectStyleRuntimeModule extends RuntimeModule {
	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {CssInjectCompilationHooks} hooks
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
				createStyle: new SyncWaterfallHook(["source", "chunk"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	/**
	 * @param {ReadOnlyRuntimeRequirements} runtimeRequirements runtime requirements
	 */
	constructor(runtimeRequirements) {
		super("css inject style", RuntimeModule.STAGE_ATTACH);
		/** @type {ReadOnlyRuntimeRequirements} */
		this._runtimeRequirements = runtimeRequirements;
	}

	/**
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate, outputOptions } = compilation;
		const { uniqueName } = outputOptions;
		const { _runtimeRequirements } = this;

		/** @type {boolean} */
		const withHmr =
			_runtimeRequirements &&
			_runtimeRequirements.has(RuntimeGlobals.hmrDownloadUpdateHandlers);

		const { createStyle } =
			CssInjectStyleRuntimeModule.getCompilationHooks(compilation);

		const createStyleElementCode = Template.asString([
			"var element = document.createElement('style');",
			"",
			`if (${RuntimeGlobals.scriptNonce}) {`,
			Template.indent(
				`element.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
			),
			"}",
			uniqueName
				? 'element.setAttribute("data-webpack", dataWebpackPrefix + key);'
				: ""
		]);

		return Template.asString([
			uniqueName
				? `var dataWebpackPrefix = ${JSON.stringify(`${uniqueName}:`)};`
				: "// data-webpack is not used as build has no uniqueName",
			"var stylesInDOM = {};",
			"",
			"function applyStyle(styleElement, css) {",
			Template.indent(["styleElement.textContent = css;"]),
			"}",
			"",
			"function removeStyleElement(styleElement) {",
			Template.indent([
				"if (styleElement.parentNode === null) {",
				Template.indent("return false;"),
				"}",
				"styleElement.parentNode.removeChild(styleElement);"
			]),
			"}",
			"",
			"function insertStyleElement(key) {",
			Template.indent([
				createStyle.call(
					createStyleElementCode,
					/** @type {Chunk} */ (this.chunk)
				),
				"",
				"var head = document.head || document.getElementsByTagName('head')[0];",
				"head.appendChild(element);",
				"",
				"return element;"
			]),
			"}",
			"",
			"function domAPI(key) {",
			Template.indent([
				"var styleElement = insertStyleElement(key);",
				"",
				"return {",
				Template.indent([
					"update: function(css) {",
					Template.indent("applyStyle(styleElement, css);"),
					"},",
					"remove: function() {",
					Template.indent("removeStyleElement(styleElement);"),
					"}"
				]),
				"};"
			]),
			"}",
			"",
			"function addElementStyle(css, identifier) {",
			Template.indent([
				"var api = domAPI(identifier);",
				"api.update(css);",
				"",
				"var updater = function(newCss) {",
				Template.indent([
					"if (newCss) {",
					Template.indent([
						"if (newCss === css) {",
						Template.indent("return;"),
						"}",
						"api.update(css = newCss);"
					]),
					"} else {",
					Template.indent("api.remove();"),
					"}"
				]),
				"};",
				"",
				"return updater;"
			]),
			"}",
			"",
			`${RuntimeGlobals.cssInjectStyle} = ${runtimeTemplate.basicFunction(
				"identifier, css",
				[
					"var styleInDom = stylesInDOM[identifier];",
					"",
					"if (styleInDom) {",
					Template.indent(["styleInDom.updater(css);"]),
					"} else {",
					Template.indent([
						"var updater = addElementStyle(css, identifier);",
						"stylesInDOM[identifier] = {",
						Template.indent(["updater: updater"]),
						"};"
					]),
					"}"
				]
			)};`,
			"",
			`${RuntimeGlobals.cssInjectStyle}.removeModules = ${runtimeTemplate.basicFunction(
				"removedModules",
				[
					"if (!removedModules) return;",
					"var identifiers = Array.isArray(removedModules) ? removedModules : [removedModules];",
					"for (var i = 0; i < identifiers.length; i++) {",
					Template.indent([
						"var identifier = identifiers[i];",
						"var styleInDom = stylesInDOM[identifier];",
						"if (styleInDom) {",
						Template.indent([
							"styleInDom.updater();",
							"delete stylesInDOM[identifier];"
						]),
						"}"
					]),
					"}"
				]
			)};`,
			withHmr
				? Template.asString([
						`${RuntimeGlobals.hmrDownloadUpdateHandlers}.cssInjectStyle = ${runtimeTemplate.basicFunction(
							"chunkIds, removedChunks, removedModules, promises, applyHandlers, updatedModulesList, css",
							[
								"if (removedModules) {",
								Template.indent(
									`${RuntimeGlobals.cssInjectStyle}.removeModules(removedModules);`
								),
								"}"
							]
						)};`
					])
				: "// no css inject style HMR download handler"
		]);
	}
}

module.exports = CssInjectStyleRuntimeModule;
