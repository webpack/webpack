/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const RuntimeModule = require("../runtime/RuntimeModule");
const Template = require("../template/Template");

/** @import Compilation from "../Compilation" */

class HotModuleReplacementRuntimeModule extends RuntimeModule {
	constructor() {
		super("hot module replacement", RuntimeModule.STAGE_BASIC);
	}

	/**
	 * The `[handlerMap, key]` pairs this module installs onto a chunk handler map
	 * such as `__webpack_require__.f`, or `null` where it cannot name them.
	 * @returns {[string, string][] | null} installed chunk handlers (do not mutate)
	 */
	getInstalledChunkHandlers() {
		return RuntimeModule.NO_CHUNK_HANDLERS;
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
			.replace(
				/\$interceptModuleExecution\$/g,
				RuntimeGlobals.interceptModuleExecution
			)
			.replace(/\$moduleCache\$/g, RuntimeGlobals.moduleCache)
			.replace(/\$hmrModuleData\$/g, RuntimeGlobals.hmrModuleData)
			.replace(/\$hmrDownloadManifest\$/g, RuntimeGlobals.hmrDownloadManifest)
			.replace(
				/\$hmrInvalidateModuleHandlers\$/g,
				RuntimeGlobals.hmrInvalidateModuleHandlers
			)
			.replace(
				/\$hmrDownloadUpdateHandlers\$/g,
				RuntimeGlobals.hmrDownloadUpdateHandlers
			);
	}
}

module.exports = HotModuleReplacementRuntimeModule;
