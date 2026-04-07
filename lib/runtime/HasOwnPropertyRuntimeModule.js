/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Compilation")} Compilation */

/**
 * Runtime module that exposes a short helper for safe own-property checks.
 */
class HasOwnPropertyRuntimeModule extends RuntimeModule {
	/**
	 * Creates the runtime module that emits webpack's `hasOwnProperty`
	 * shorthand helper.
	 */
	constructor() {
		super("hasOwnProperty shorthand");
	}

	/**
	 * /**
	 * Generates the helper function that proxies to
	 * `Object.prototype.hasOwnProperty.call`.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;

		return Template.asString([
			`${RuntimeGlobals.hasOwnProperty} = ${runtimeTemplate.returningFunction(
				"Object.prototype.hasOwnProperty.call(obj, prop)",
				"obj, prop"
			)}`
		]);
	}
}

module.exports = HasOwnPropertyRuntimeModule;
