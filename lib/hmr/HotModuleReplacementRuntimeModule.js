/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Compilation")} Compilation */

class HotModuleReplacementRuntimeModule extends RuntimeModule {
	constructor() {
		super("hot module replacement", RuntimeModule.STAGE_BASIC);
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { runtimeTemplate } = /** @type {Compilation} */ (this.compilation);
		return Template.getFunctionContent(
			require("./HotModuleReplacement.runtime")
		)
			.replace(
				"Object.prototype.hasOwnProperty.call(require, name)",
				runtimeTemplate.objectHasOwn("require", "name")
			)
			.replaceAll(
				"$interceptModuleExecution$",
				RuntimeGlobals.interceptModuleExecution
			)
			.replaceAll("$moduleCache$", RuntimeGlobals.moduleCache)
			.replaceAll("$hmrModuleData$", RuntimeGlobals.hmrModuleData)
			.replaceAll("$hmrDownloadManifest$", RuntimeGlobals.hmrDownloadManifest)
			.replaceAll(
				"$hmrInvalidateModuleHandlers$",
				RuntimeGlobals.hmrInvalidateModuleHandlers
			)
			.replaceAll(
				"$hmrDownloadUpdateHandlers$",
				RuntimeGlobals.hmrDownloadUpdateHandlers
			);
	}
}

module.exports = HotModuleReplacementRuntimeModule;
