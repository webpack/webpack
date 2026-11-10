/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @import Compiler from "../Compiler" */

const PLUGIN_NAME = "AddBuildDependenciesPlugin";

/**
 * @typedef {object} NormalizedBuildDependencyItem
 * @property {string} dependency request to resolve
 * @property {boolean} optional when true the dependency may be missing
 */

class AddBuildDependenciesPlugin {
	/**
	 * Creates an instance of AddBuildDependenciesPlugin.
	 * @param {NormalizedBuildDependencyItem[]} buildDependencies normalized build dependencies
	 */
	constructor(buildDependencies) {
		this.buildDependencies = [...buildDependencies];
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			for (const { dependency, optional } of this.buildDependencies) {
				compilation.buildDependencies.add(dependency);
				if (optional) {
					compilation.optionalBuildDependencies.add(dependency);
					compilation.missingDependencies.add(dependency);
					compilation.fileDependencies.add(dependency);
				}
			}
		});
	}
}

module.exports = AddBuildDependenciesPlugin;
