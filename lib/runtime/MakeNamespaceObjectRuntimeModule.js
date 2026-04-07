/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

/**
 * Runtime helper that marks an exports object as an ES module namespace.
 */
class MakeNamespaceObjectRuntimeModule extends HelperRuntimeModule {
	/**
	 * Creates the runtime module that emits the namespace-marking helper.
	 */
	constructor() {
		super("make namespace object");
	}

	/**
	 * /**
	 * Generates the helper that adds `__esModule` and `Symbol.toStringTag`
	 * metadata to an exports object.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const fn = RuntimeGlobals.makeNamespaceObject;
		return Template.asString([
			"// define __esModule on exports",
			`${fn} = ${runtimeTemplate.basicFunction("exports", [
				"if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {",
				Template.indent([
					"Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });"
				]),
				"}",
				"Object.defineProperty(exports, '__esModule', { value: true });"
			])};`
		]);
	}
}

module.exports = MakeNamespaceObjectRuntimeModule;
