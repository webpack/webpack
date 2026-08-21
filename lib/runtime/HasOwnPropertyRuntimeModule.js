/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @import Compilation from "../Compilation" */

class HasOwnPropertyRuntimeModule extends RuntimeModule {
	constructor() {
		super("hasOwnProperty shorthand");
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

		return Template.asString([
			`${RuntimeGlobals.hasOwnProperty} = ${runtimeTemplate.returningFunction(
				runtimeTemplate.objectHasOwn("obj", "prop"),
				"obj, prop"
			)};`
		]);
	}
}

module.exports = HasOwnPropertyRuntimeModule;
