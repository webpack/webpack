/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
/** @typedef {import("../Compilation")} Compilation */
const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const createHooksRegistry = require("../util/createHooksRegistry");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Module").ReadOnlyRuntimeRequirements} ReadOnlyRuntimeRequirements */

/**
 * @typedef {object} CssInjectCompilationHooks
 * @property {SyncWaterfallHook<[string, Chunk]>} createStyle
 */

class CssInjectStyleRuntimeModule extends RuntimeModule {
	/**
	 * @param {ReadOnlyRuntimeRequirements} runtimeRequirements runtime requirements
	 */
	constructor(runtimeRequirements) {
		super("css inject style", RuntimeModule.STAGE_ATTACH);
		/** @type {ReadOnlyRuntimeRequirements} */
		this._runtimeRequirements = runtimeRequirements;
	}

	/**
	 * Generates runtime code for this runtime module.
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

		// Only emit the nonce check when scriptNonce is part of the runtime
		// requirements. Otherwise referencing `__webpack_require__.nc` would
		// keep the require runtime alive for nothing.
		const withScriptNonce =
			_runtimeRequirements &&
			_runtimeRequirements.has(RuntimeGlobals.scriptNonce);

		const cst = runtimeTemplate.renderConst();
		const isNeutralPlatform = runtimeTemplate.isNeutralPlatform();
		// universal targets run in node too: collect styles for SSR retrieval
		// instead of touching a DOM that isn't there
		const injectGuard = isNeutralPlatform
			? [
					"if (typeof document === 'undefined') {",
					Template.indent([
						`${runtimeTemplate.cssServerStyleRegistry()}[identifier] = css;`,
						"return;"
					]),
					"}"
				]
			: [];
		const removeGuard = isNeutralPlatform
			? [
					"if (typeof document === 'undefined') {",
					Template.indent([
						`${cst} styles = ${runtimeTemplate.cssServerStyleRegistry()};`,
						"for (var i = 0; i < identifiers.length; i++) delete styles[identifiers[i]];",
						"return;"
					]),
					"}"
				]
			: [];

		const createStyleElementCode = Template.asString([
			`${cst} style = document.createElement('style');`,
			"",
			...(withScriptNonce
				? [
						`if (${RuntimeGlobals.scriptNonce}) {`,
						Template.indent(
							`style.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
						),
						"}"
					]
				: []),
			'style.setAttribute("data-webpack", getDataWebpackId(key));'
		]);

		return Template.asString([
			`${cst} dataWebpackPrefix = ${uniqueName ? JSON.stringify(`${uniqueName}:`) : '"webpack:"'};`,
			"",
			"function getDataWebpackId(identifier) {",
			Template.indent("return dataWebpackPrefix + identifier;"),
			"}",
			"",
			"function findStyleElement(identifier) {",
			Template.indent([
				`${cst} elements = document.getElementsByTagName('style');`,
				"for (var i = 0; i < elements.length; i++) {",
				Template.indent([
					`${cst} el = elements[i];`,
					"if (el.getAttribute('data-webpack') === getDataWebpackId(identifier)) {",
					Template.indent("return el;"),
					"}"
				]),
				"}",
				"return null;"
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
				"document.head.appendChild(style);",
				"",
				"return style;"
			]),
			"}",
			"",
			`${RuntimeGlobals.cssInjectStyle} = ${runtimeTemplate.basicFunction(
				"identifier, css",
				[
					...injectGuard,
					`${cst} element = findStyleElement(identifier) || insertStyleElement(identifier);`,
					"element.textContent = css;"
				]
			)};`,
			"",
			withHmr
				? Template.asString([
						"",
						"function removeStyleElement(styleElement) {",
						Template.indent([
							"if (styleElement.parentNode) {",
							Template.indent(
								"styleElement.parentNode.removeChild(styleElement);"
							),
							"}"
						]),
						"}",
						`${RuntimeGlobals.cssInjectStyle}.removeModules = ${runtimeTemplate.basicFunction(
							"removedModules",
							[
								"if (!removedModules) return;",
								`${cst} identifiers = Array.isArray(removedModules) ? removedModules : [removedModules];`,
								...removeGuard,
								"for (var i = 0; i < identifiers.length; i++) {",
								Template.indent([
									`${cst} identifier = identifiers[i];`,
									`${cst} element = findStyleElement(identifier);`,
									"if (element) {",
									Template.indent("removeStyleElement(element);"),
									"}"
								]),
								"}"
							]
						)};`,
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

CssInjectStyleRuntimeModule.getCompilationHooks = createHooksRegistry(
	() =>
		/** @type {CssInjectCompilationHooks} */ ({
			createStyle: new SyncWaterfallHook(["source", "chunk"])
		})
);

module.exports = CssInjectStyleRuntimeModule;
