/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

/**
 * Runtime helper that defines enumerable getter properties for harmony export
 * bindings.
 */
class DefinePropertyGettersRuntimeModule extends HelperRuntimeModule {
	/**
	 * Creates the runtime module that emits the export-getter definition helper.
	 */
	constructor() {
		super("define property getters");
	}

	/**
	 * /**
	 * Generates the helper that attaches getter functions for export bindings
	 * without overwriting existing properties.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const fn = RuntimeGlobals.definePropertyGetters;
		return Template.asString([
			"// define getter functions for harmony exports",
			`${fn} = ${runtimeTemplate.basicFunction("exports, definition", [
				"for(var key in definition) {",
				Template.indent([
					`if(${RuntimeGlobals.hasOwnProperty}(definition, key) && !${RuntimeGlobals.hasOwnProperty}(exports, key)) {`,
					Template.indent([
						"Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });"
					]),
					"}"
				]),
				"}"
			])};`
		]);
	}
}

module.exports = DefinePropertyGettersRuntimeModule;
