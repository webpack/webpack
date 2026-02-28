/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Chunk")} Chunk */

class CssInjectStyleRuntimeModule extends RuntimeModule {
	constructor() {
		super("css inject style");
	}

	/**
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { runtimeTemplate } = /** @type {import("../Compilation")} */ (
			this.compilation
		);

		return Template.asString([
			"// style-loader runtime: inject styles into DOM",
			"// Shared state across all calls to cssInjectStyle",
			"var stylesInDOM = [];",
			"",
			`${RuntimeGlobals.cssInjectStyle} = ${runtimeTemplate.basicFunction(
				"list, options",
				[
					"options = options || {};",
					"",
					"function getIndexByIdentifier(identifier) {",
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
					"function insertStyleElement(options) {",
					Template.indent([
						"var element = document.createElement('style');",
						"",
						"// Set nonce if available",
						"var nonce = typeof __webpack_nonce__ !== 'undefined' ? __webpack_nonce__ : null;",
						"if (nonce) {",
						Template.indent("element.setAttribute('nonce', nonce);"),
						"}",
						"",
						"// Set attributes if provided",
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
						"// Insert element",
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
					"function modulesToDom(list, options) {",
					Template.indent([
						"var idCountMap = {};",
						"var identifiers = [];",
						"",
						"for (var i = 0; i < list.length; i++) {",
						Template.indent([
							"var item = list[i];",
							"var id = options.base ? item[0] + options.base : item[0];",
							"var count = idCountMap[id] || 0;",
							"var identifier = id + ' ' + count;",
							"",
							"idCountMap[id] = count + 1;",
							"",
							"var indexByIdentifier = getIndexByIdentifier(identifier);",
							"var obj = {",
							Template.indent(["css: item[1] || ''"]),
							"};",
							"",
							"if (indexByIdentifier !== -1) {",
							Template.indent([
								"stylesInDOM[indexByIdentifier].references++;",
								"stylesInDOM[indexByIdentifier].updater(obj);"
							]),
							"} else {",
							Template.indent([
								"var updater = addElementStyle(obj, options);",
								"",
								"options.byIndex = i;",
								"",
								"stylesInDOM.splice(i, 0, {",
								Template.indent([
									"identifier: identifier,",
									"updater: updater,",
									"references: 1"
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
					"list = list || [];",
					"",
					"var lastIdentifiers = modulesToDom(list, options);",
					"",
					"// Get the style element that was just inserted",
					"var styleElement = null;",
					"if (typeof document !== 'undefined' && stylesInDOM.length > 0) {",
					Template.indent([
						"// Find the most recently inserted style element",
						"// The last item in stylesInDOM should be the one we just created",
						"var lastStyle = stylesInDOM[stylesInDOM.length - 1];",
						"if (lastStyle && lastStyle.updater) {",
						Template.indent([
							"// Get the style element from the DOM",
							"var styles = document.querySelectorAll('style');",
							"if (list.length > 0 && list[list.length - 1]) {",
							Template.indent([
								"var lastCss = list[list.length - 1][1] || '';",
								"for (var i = styles.length - 1; i >= 0; i--) {",
								Template.indent([
									"var style = styles[i];",
									"if (style.textContent && style.textContent.indexOf(lastCss) !== -1) {",
									Template.indent(["styleElement = style;", "break;"]),
									"}"
								]),
								"}"
							]),
							"}"
						]),
						"}"
					]),
					"}",
					"",
					"var updateFn = function update(newList) {",
					Template.indent([
						"newList = newList || [];",
						"",
						"for (var i = 0; i < lastIdentifiers.length; i++) {",
						Template.indent([
							"var identifier = lastIdentifiers[i];",
							"var index = getIndexByIdentifier(identifier);",
							"",
							"stylesInDOM[index].references--;"
						]),
						"}",
						"",
						"var newLastIdentifiers = modulesToDom(newList, options);",
						"",
						"for (var i = 0; i < lastIdentifiers.length; i++) {",
						Template.indent([
							"var identifier = lastIdentifiers[i];",
							"var index = getIndexByIdentifier(identifier);",
							"",
							"if (stylesInDOM[index].references === 0) {",
							Template.indent([
								"stylesInDOM[index].updater();",
								"stylesInDOM.splice(index, 1);"
							]),
							"}"
						]),
						"}",
						"",
						"lastIdentifiers = newLastIdentifiers;"
					]),
					"};",
					"",
					"// Create dispose function to remove style element",
					"var disposeFn = function dispose() {",
					Template.indent([
						"if (styleElement && styleElement.parentNode) {",
						Template.indent(
							"styleElement.parentNode.removeChild(styleElement);"
						),
						"}"
					]),
					"};",
					"",
					"// Return object with styleElement, updater and dispose for HMR",
					"return {",
					Template.indent(["update: updateFn,", "dispose: disposeFn"]),
					"};"
				]
			)};`
		]);
	}
}

module.exports = CssInjectStyleRuntimeModule;
