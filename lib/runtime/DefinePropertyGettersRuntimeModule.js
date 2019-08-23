/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

class DefinePropertyGettersRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("define property getters");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const fn = RuntimeGlobals.definePropertyGetters;
		return Template.asString([
			"// define getter functions for harmony exports",
			"var hasOwnProperty = Object.prototype.hasOwnProperty;",
			`${fn} = function(exports, definition) {`,
			Template.indent([
				`for(var key in definition) {`,
				Template.indent([
					"if(hasOwnProperty.call(definition, key) && !hasOwnProperty.call(exports, key)) {",
					Template.indent([
						"Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });"
					]),
					"}"
				]),
				"}"
			]),
			"};"
		]);
	}
}

module.exports = DefinePropertyGettersRuntimeModule;
