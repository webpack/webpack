/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import RuntimeModule from "../RuntimeModule.js";
import Template from "../Template.js";

const require = createRequire(import.meta.url);
/** @typedef {import("../Compilation.js").default} Compilation */

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
			/** @type {typeof import("./HotModuleReplacement.runtime.js")} */ (
				require("./HotModuleReplacement.runtime.js")
			).default
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

export default HotModuleReplacementRuntimeModule;

export { HotModuleReplacementRuntimeModule as "module.exports" };
