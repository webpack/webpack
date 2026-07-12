/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

/** @typedef {import("../Compiler.js").default} Compiler */

const PLUGIN_NAME = "AddBuildDependenciesPlugin";

class AddBuildDependenciesPlugin {
	/**
	 * Creates an instance of AddBuildDependenciesPlugin.
	 * @param {Iterable<string>} buildDependencies list of build dependencies
	 */
	constructor(buildDependencies) {
		/** @type {Set<string>} */
		this.buildDependencies = new Set(buildDependencies);
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.buildDependencies.addAll(this.buildDependencies);
		});
	}
}

export default AddBuildDependenciesPlugin;

export { AddBuildDependenciesPlugin as "module.exports" };
