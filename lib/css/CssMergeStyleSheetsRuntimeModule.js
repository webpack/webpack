/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Chunk")} Chunk */

class CssMergeStyleSheetsRuntimeModule extends RuntimeModule {
	constructor() {
		super("css merge stylesheets");
	}

	/**
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { runtimeTemplate } = /** @type {import("../Compilation")} */ (
			this.compilation
		);

		return Template.asString([
			`${RuntimeGlobals.cssMergeStyleSheets} = ${runtimeTemplate.basicFunction(
				"sheets, returnType",
				[
					"// Convert sheets to array if not already",
					"var sheetsArray = Array.isArray(sheets) ? sheets : [sheets];",
					"",
					"// Collect all CSS text from sheets",
					"var cssTexts = [];",
					"for (var i = 0; i < sheetsArray.length; i++) {",
					Template.indent([
						"var s = sheetsArray[i];",
						"if (!s) continue;",
						"// If it's a string, add it directly",
						"if (typeof s === 'string') {",
						Template.indent(["cssTexts.push(s);"]),
						"} else if (s.cssRules) {",
						Template.indent([
							"// If it's a CSSStyleSheet, extract cssRules",
							"try {",
							Template.indent([
								"var rules = s.cssRules;",
								"for (var j = 0; j < rules.length; j++) {",
								Template.indent(["cssTexts.push(rules[j].cssText);"]),
								"}"
							]),
							"} catch(e) {",
							Template.indent(["// If accessing cssRules fails, skip"]),
							"}"
						]),
						"}"
					]),
					"}",
					"var cssText = cssTexts.join('\\n');",
					"",
					"// Return based on returnType",
					"if (returnType === 'css-style-sheet') {",
					Template.indent([
						"var sheet = new CSSStyleSheet();",
						"if (cssText && cssText.trim()) {",
						Template.indent([
							"try {",
							Template.indent(["sheet.replaceSync(cssText);"]),
							"} catch(e) {",
							Template.indent([
								"// If replaceSync fails, return empty sheet",
								"// This can happen with invalid CSS"
							]),
							"}"
						]),
						"}",
						"return sheet;"
					]),
					"}",
					"",
					"// Default: return as text",
					"return cssText;"
				]
			)};`
		]);
	}
}

module.exports = CssMergeStyleSheetsRuntimeModule;
