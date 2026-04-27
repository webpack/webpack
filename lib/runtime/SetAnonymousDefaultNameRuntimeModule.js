/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

class SetAnonymousDefaultNameRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("set anonymous default export name");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const fn = RuntimeGlobals.setAnonymousDefaultName;
		return Template.asString([
			"// set .name for anonymous default exports per ES spec",
			`${fn} = ${runtimeTemplate.basicFunction("x", [
				'(Object.getOwnPropertyDescriptor(x, "name") || {}).writable || Object.defineProperty(x, "name", { value: "default", configurable: true });'
			])};`
		]);
	}
}

module.exports = SetAnonymousDefaultNameRuntimeModule;
