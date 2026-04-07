/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Chunk")} Chunk */

/**
 * Runtime helper that merges CSS text from strings or stylesheet objects into
 * a single concatenated string.
 */
class CssMergeStyleSheetsRuntimeModule extends RuntimeModule {
	/**
	 * Registers the helper exposed as `RuntimeGlobals.cssMergeStyleSheets`.
	 */
	constructor() {
		super("css merge stylesheets");
	}

	/**
	 * Generates the helper that normalizes one or many stylesheet inputs and
	 * concatenates their rule text for injection or comparison.
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
					"var sheetsArray = Array.isArray(sheets) ? sheets : [sheets];",
					"var cssTexts = [];",
					"for (var i = 0; i < sheetsArray.length; i++) {",
					Template.indent([
						"var s = sheetsArray[i];",
						"if (!s) continue;",
						"if (typeof s === 'string') {",
						Template.indent("cssTexts.push(s);"),
						"} else if (s.cssRules) {",
						Template.indent([
							"var rules = s.cssRules;",
							"for (var j = 0; j < rules.length; j++) {",
							Template.indent("cssTexts.push(rules[j].cssText);"),
							"}"
						]),
						"}"
					]),
					"}",
					"return cssTexts.join('');"
				]
			)};`
		]);
	}
}

module.exports = CssMergeStyleSheetsRuntimeModule;
