/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

/**
 * Runtime helper that optionally routes dynamically created script contents
 * through a Trusted Types policy.
 */
class CreateScriptRuntimeModule extends HelperRuntimeModule {
	/**
	 * Creates the runtime module that emits the script-creation helper.
	 */
	constructor() {
		super("trusted types script");
	}

	/**
	 * /**
	 * Generates the helper that converts a script string into the value that
	 * should be assigned to a script element.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate, outputOptions } = compilation;
		const { trustedTypes } = outputOptions;
		const fn = RuntimeGlobals.createScript;

		return Template.asString(
			`${fn} = ${runtimeTemplate.returningFunction(
				trustedTypes
					? `${RuntimeGlobals.getTrustedTypesPolicy}().createScript(script)`
					: "script",
				"script"
			)};`
		);
	}
}

module.exports = CreateScriptRuntimeModule;
