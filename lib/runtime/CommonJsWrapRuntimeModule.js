/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

class CommonJsWrapRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("wrap commonjs module");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const fn = RuntimeGlobals.commonJsWrap;
		return Template.asString([
			"// execute a CommonJS module body with real module/exports objects, returning the final exports",
			`${fn} = ${runtimeTemplate.basicFunction("body", [
				`${runtimeTemplate.renderConst()} mod = { exports: {} };`,
				"body.call(mod.exports, mod, mod.exports);",
				"return mod.exports;"
			])};`
		]);
	}
}

module.exports = CommonJsWrapRuntimeModule;
