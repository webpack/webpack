/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

/**
 * Runtime helper that optionally routes dynamically created script URLs
 * through a Trusted Types policy.
 */
class CreateScriptUrlRuntimeModule extends HelperRuntimeModule {
	/**
	 * Creates the runtime module that emits the script-URL helper.
	 */
	constructor() {
		super("trusted types script url");
	}

	/**
	 * /**
	 * Generates the helper that converts a URL string into the value that
	 * should be assigned to a script URL sink.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate, outputOptions } = compilation;
		const { trustedTypes } = outputOptions;
		const fn = RuntimeGlobals.createScriptUrl;

		return Template.asString(
			`${fn} = ${runtimeTemplate.returningFunction(
				trustedTypes
					? `${RuntimeGlobals.getTrustedTypesPolicy}().createScriptURL(url)`
					: "url",
				"url"
			)};`
		);
	}
}

module.exports = CreateScriptUrlRuntimeModule;
