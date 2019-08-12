/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Compiler")} Compiler */

class AddManagedPathsPlugin {
	/**
	 * @param {Iterable<string>} managedPaths list of managed paths
	 */
	constructor(managedPaths) {
		this.managedPaths = new Set(managedPaths);
	}

	/**
	 * @param {Compiler} compiler Webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		for (const managedPath of this.managedPaths) {
			compiler.managedPaths.add(managedPath);
		}
	}
}

module.exports = AddManagedPathsPlugin;
