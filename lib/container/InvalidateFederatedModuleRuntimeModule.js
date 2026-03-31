/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Compilation")} Compilation */

/**
 * Runtime module that installs `__webpack_require__.federation`, a namespace
 * object providing Module Federation utilities.
 *
 * Currently exposes:
 * - `invalidateRemote(moduleId)`: Clears the webpack module cache entry for
 * `moduleId` AND resets the remote-handler promise flag (`data.p`) stored
 * in the shared `idToExternalAndNameMapping` table so that the next
 * `ensureChunk` call re-fetches the remote container and re-executes the
 * federated module with fresh code.
 *
 * The mapping is exposed by `RemoteRuntimeModule` on
 * `__webpack_require__.federation._remoteMapping` so this module can reach it
 * without escaping closures.
 */
class InvalidateFederatedModuleRuntimeModule extends RuntimeModule {
	constructor() {
		super("federation invalidation", RuntimeModule.STAGE_ATTACH);
	}

	/**
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;

		return Template.asString([
			`${RuntimeGlobals.federation} = {`,
			Template.indent([
				'// Internal: mapping populated by the "remotes loading" runtime module.',
				"// Keyed by module id, value is the data object (with .p promise/flag).",
				"_remoteMapping: {},",
				"",
				"// Invalidate a federated remote module so the next load fetches fresh code.",
				"// moduleId - the webpack module id of the RemoteModule to invalidate.",
				`invalidateRemote: ${runtimeTemplate.basicFunction("moduleId", [
					"// 1. Remove the cached module exports so re-execution is forced.",
					`delete ${RuntimeGlobals.moduleCache}[moduleId];`,
					"",
					"// 2. Remove the module factory so the remote handler re-installs it.",
					`delete ${RuntimeGlobals.moduleFactories}[moduleId];`,
					"",
					"// 3. Reset the per-remote fetch promise/flag so the ensureChunk",
					"//    handler re-fetches the remote container entry.",
					`var mapping = ${RuntimeGlobals.federation}._remoteMapping;`,
					"var data = mapping[moduleId];",
					"if (data) {",
					Template.indent([
						"// data.p: 0 = error, 1 = loaded, Promise = in-flight.",
						"// Reset to undefined so the handler treats it as not-yet-started.",
						"data.p = undefined;"
					]),
					"}"
				])}`
			]),
			"};"
		]);
	}
}

module.exports = InvalidateFederatedModuleRuntimeModule;
