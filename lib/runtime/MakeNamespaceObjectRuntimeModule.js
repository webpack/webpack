/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

class MakeNamespaceObjectRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("make namespace object");
	}

	/**
	 * @param {TODO} generateContext context
	 * @returns {string} runtime code
	 */
	generate(generateContext) {
		const fn = RuntimeGlobals.makeNamespaceObject;
		return Template.asString([
			"// define __esModule on exports",
			`${fn} = function(exports) {`,
			Template.indent([
				"if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {",
				Template.indent([
					"Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });"
				]),
				"}",
				"Object.defineProperty(exports, '__esModule', { value: true });"
			]),
			"};"
		]);
	}
}

module.exports = MakeNamespaceObjectRuntimeModule;
