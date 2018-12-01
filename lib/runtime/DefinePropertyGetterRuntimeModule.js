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
	 * @returns {string} runtime code
	 */
	generate() {
		const fn = RuntimeGlobals.definePropertyGetter;
		return Template.asString([
			"// define getter function for harmony exports",
			"var hasOwnProperty = Object.prototype.hasOwnProperty;",
			`${fn} = function(exports, name, getter) {`,
			Template.indent([
				`if(!hasOwnProperty.call(exports, name)) {`,
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
