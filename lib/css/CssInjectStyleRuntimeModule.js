/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Module").ReadOnlyRuntimeRequirements} ReadOnlyRuntimeRequirements */

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
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { _runtimeRequirements } = this;
		const { runtimeTemplate } = /** @type {import("../Compilation")} */ (
			this.compilation
		);
		/** @type {boolean} */
		const withHmr =
			_runtimeRequirements &&
			_runtimeRequirements.has(RuntimeGlobals.hmrDownloadUpdateHandlers);

		return Template.asString([
			"var stylesInDOM = [];",
			"",
			"function findIndex(identifier) {",
			Template.indent([
				"var result = -1;",
				"for (var i = 0; i < stylesInDOM.length; i++) {",
				Template.indent([
					"if (stylesInDOM[i].identifier === identifier) {",
					Template.indent(["result = i;", "break;"]),
					"}"
				]),
				"}",
				"return result;"
			]),
			"}",
			"",
			"function removeStyleAtIndex(index) {",
			Template.indent([
				"var styleInDom = stylesInDOM[index];",
				"styleInDom.updater();",
				"stylesInDOM.splice(index, 1);"
			]),
			"}",
			"",
			`${RuntimeGlobals.cssInjectStyle} = ${runtimeTemplate.basicFunction(
				"list, options",
				[
					"options = options || {};",
					"",
					"function insertStyleElement(options) {",
					Template.indent([
						"var element = document.createElement('style');",
						"",
						`if (${RuntimeGlobals.scriptNonce}) {`,
						Template.indent(
							`link.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
						),
						"}",
						"",
						"if (options.attributes) {",
						Template.indent([
							"for (var key in options.attributes) {",
							Template.indent([
								"if (options.attributes.hasOwnProperty(key)) {",
								Template.indent(
									"element.setAttribute(key, options.attributes[key]);"
								),
								"}"
							]),
							"}"
						]),
						"}",
						"",
						"var insert = options.insert || function(element) {",
						Template.indent([
							"var head = document.head || document.getElementsByTagName('head')[0];",
							"head.appendChild(element);"
						]),
						"};",
						"insert(element);",
						"",
						"return element;"
					]),
					"}",
					"",
					"function applyStyle(styleElement, options, obj) {",
					Template.indent(["styleElement.textContent = obj.css || '';"]),
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
					"function domAPI(options) {",
					Template.indent([
						"if (typeof document === 'undefined') {",
						Template.indent([
							"return {",
							Template.indent([
								"update: function() {},",
								"remove: function() {}"
							]),
							"};"
						]),
						"}",
						"",
						"var styleElement = insertStyleElement(options);",
						"",
						"return {",
						Template.indent([
							"update: function(obj) {",
							Template.indent("applyStyle(styleElement, options, obj);"),
							"},",
							"remove: function() {",
							Template.indent("removeStyleElement(styleElement);"),
							"}"
						]),
						"};"
					]),
					"}",
					"",
					"function addElementStyle(obj, options) {",
					Template.indent([
						"var api = domAPI(options);",
						"api.update(obj);",
						"",
						"var updater = function(newObj) {",
						Template.indent([
							"if (newObj) {",
							Template.indent([
								"if (newObj.css === obj.css) {",
								Template.indent("return;"),
								"}",
								"api.update(obj = newObj);"
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
					"function injectOrUpdate(list, options) {",
					Template.indent([
						"var identifiers = [];",
						"",
						"for (var i = 0; i < list.length; i++) {",
						Template.indent([
							"var item = list[i];",
							"var identifier = item[0];",
							"",
							"var indexByIdentifier = findIndex(identifier);",
							"var obj = {",
							Template.indent(["css: item[1] || ''"]),
							"};",
							"",
							"if (indexByIdentifier !== -1) {",
							Template.indent(["stylesInDOM[indexByIdentifier].updater(obj);"]),
							"} else {",
							Template.indent([
								"var updater = addElementStyle(obj, options);",
								"stylesInDOM.splice(i, 0, {",
								Template.indent([
									"identifier: identifier,",
									"updater: updater"
								]),
								"});"
							]),
							"}",
							"",
							"identifiers.push(identifier);"
						]),
						"}",
						"",
						"return identifiers;"
					]),
					"}",
					"",
					"injectOrUpdate(list, options);"
				]
			)};`,
			"",
			`${RuntimeGlobals.cssInjectStyle}.rmModules = ${runtimeTemplate.basicFunction(
				"removedModules",
				[
					"if (!removedModules) return;",
					"var identifiers = Array.isArray(removedModules) ? removedModules : [removedModules];",
					"for (var i = 0; i < identifiers.length; i++) {",
					Template.indent([
						"var identifier = identifiers[i];",
						"var index = findIndex(identifier);",
						"if (index !== -1) {",
						Template.indent(["removeStyleAtIndex(index);"]),
						"}"
					]),
					"}"
				]
			)};`,
			withHmr
				? Template.asString([
						`${RuntimeGlobals.hmrDownloadUpdateHandlers}.cssInject = ${runtimeTemplate.basicFunction(
							"chunkIds, removedChunks, removedModules, promises, applyHandlers, updatedModulesList, css",
							[
								"if (removedModules) {",
								Template.indent(
									`${RuntimeGlobals.cssInjectStyle}.rmModules(removedModules);`
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
