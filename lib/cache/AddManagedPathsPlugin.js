/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Compiler")} Compiler */

class AddManagedPathsPlugin {
	/**
	 * @param {Iterable<string>} managedPaths list of managed paths
	 * @param {Iterable<string>} immutablePaths list of immutable paths
	 */
	constructor(managedPaths, immutablePaths) {
		this.managedPaths = new Set(managedPaths);
		this.immutablePaths = new Set(immutablePaths);
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		for (const managedPath of this.managedPaths) {
			compiler.managedPaths.add(managedPath);
		}
		for (const immutablePath of this.immutablePaths) {
			compiler.immutablePaths.add(immutablePath);
		}
	}
}

module.exports = AddManagedPathsPlugin;
