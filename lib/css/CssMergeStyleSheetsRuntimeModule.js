/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
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
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { runtimeTemplate } = /** @type {import("../Compilation")} */ (
			this.compilation
		);

		return Template.asString([
			`${RuntimeGlobals.cssMergeStyleSheets} = ${runtimeTemplate.basicFunction(
				"sheets",
				[
					`${runtimeTemplate.renderConst()} sheetsArray = Array.isArray(sheets) ? sheets : [sheets];`,
					`${runtimeTemplate.renderConst()} result = [];`,
					"for (var i = 0; i < sheetsArray.length; i++) {",
					Template.indent([
						"var s = sheetsArray[i];",
						"if (!s) continue;",
						"if (typeof s === 'string') {",
						Template.indent("result.push(s);"),
						"} else if (s.cssRules) {",
						Template.indent([
							"var rules = s.cssRules;",
							"var sheetText = '';",
							"for (var j = 0; j < rules.length; j++) {",
							Template.indent('sheetText += rules[j].cssText + "\\n";'),
							"}",
							"result.push(sheetText);"
						]),
						"}"
					]),
					"}",
					"return result.join('');"
				]
			)};`
		]);
	}
}

module.exports = CssMergeStyleSheetsRuntimeModule;
