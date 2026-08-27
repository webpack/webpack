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

/**
 * @param {string | { dependency: string, optional?: boolean }} item build dependency
 * @returns {NormalizedBuildDependencyItem} normalized build dependency
 */
const normalizeBuildDependencyItem = (item) => {
	if (typeof item === "string") {
		return { dependency: item, optional: false };
	}
	return {
		dependency: item.dependency,
		optional: Boolean(item.optional)
	};
};

class AddBuildDependenciesPlugin {
	/**
	 * Creates an instance of AddBuildDependenciesPlugin.
	 * @param {Iterable<string | { dependency: string, optional?: boolean }>} buildDependencies list of build dependencies
	 */
	constructor(buildDependencies) {
		/** @type {NormalizedBuildDependencyItem[]} */
		this.buildDependencies = [...buildDependencies].map(
			normalizeBuildDependencyItem
		);
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
