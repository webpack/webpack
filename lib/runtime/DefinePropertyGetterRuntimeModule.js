/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

class DefinePropertyGetterRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("define property getter");
	}

	/**
	 * @param {TODO} generateContext context
	 * @returns {string} runtime code
	 */
	generate(generateContext) {
		const fn = RuntimeGlobals.definePropertyGetter;
		return Template.asString([
			"// define getter function for harmony exports",
			`${fn} = function(exports, name, getter) {`,
			Template.indent([
				`if(!${RuntimeGlobals.hasOwnProperty}(exports, name)) {`,
				Template.indent([
					"Object.defineProperty(exports, name, { enumerable: true, get: getter });"
				]),
				"}"
			]),
			"};"
		]);
	}
}

module.exports = DefinePropertyGetterRuntimeModule;
