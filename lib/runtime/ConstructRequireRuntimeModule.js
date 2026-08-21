/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @import Compilation from "../Compilation" */

class ConstructRequireRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("construct require");
	}

	/**
	 * Returns true, if the runtime module should get it's own scope.
	 * When false, `generate()` must emit complete statements ending with `;`
	 * so a following runtime IIFE is not parsed as a call (ASI).
	 * @returns {boolean} true, if the runtime module should get it's own scope
	 */
	shouldIsolate() {
		return false;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const fn = RuntimeGlobals.constructRequire;
		return Template.asString([
			"// `new require(id)` invokes the require function as a constructor, so a",
			"// primitive module.exports is discarded in favor of the freshly created",
			"// instance, exactly as in Node.js. A concatenated module has no require",
			"// call left, so apply that rule to its exports value instead.",
			`${fn} = ${runtimeTemplate.basicFunction("exports", [
				`${runtimeTemplate.renderConst()} isObject =`,
				Template.indent(
					'exports !== null && (typeof exports === "object" || typeof exports === "function");'
				),
				`return isObject ? exports : Object.create(${RuntimeGlobals.require}.prototype);`
			])};`
		]);
	}
}

module.exports = ConstructRequireRuntimeModule;
