/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { getEntryRuntime, mergeRuntimeOwned } from "./util/runtime.js";
/** @typedef {import("./Compiler.js").default} Compiler */
/** @typedef {import("./Module.js").FactoryMeta} FactoryMeta */
/** @typedef {import("./util/runtime.js").RuntimeSpec} RuntimeSpec */

const PLUGIN_NAME = "FlagAllModulesAsUsedPlugin";
class FlagAllModulesAsUsedPlugin {
	/**
	 * Creates an instance of FlagAllModulesAsUsedPlugin.
	 * @param {string} explanation explanation
	 */
	constructor(explanation) {
		/** @type {string} */
		this.explanation = explanation;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			const moduleGraph = compilation.moduleGraph;
			compilation.hooks.optimizeDependencies.tap(PLUGIN_NAME, (modules) => {
				/** @type {RuntimeSpec} */
				let runtime;
				for (const [name, { options }] of compilation.entries) {
					runtime = mergeRuntimeOwned(
						runtime,
						getEntryRuntime(compilation, name, options)
					);
				}
				for (const module of modules) {
					const exportsInfo = moduleGraph.getExportsInfo(module);
					exportsInfo.setUsedInUnknownWay(runtime);
					moduleGraph.addExtraReason(module, this.explanation);
				}
			});
		});
	}
}

export default FlagAllModulesAsUsedPlugin;

export { FlagAllModulesAsUsedPlugin as "module.exports" };
