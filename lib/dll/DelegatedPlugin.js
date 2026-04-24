/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const DelegatedSourceDependency = require("../dependencies/DelegatedSourceDependency");
const DelegatedModuleFactoryPlugin = require("./DelegatedModuleFactoryPlugin");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("./DelegatedModuleFactoryPlugin").Options} Options */

const PLUGIN_NAME = "DelegatedPlugin";

class DelegatedPlugin {
	/**
	 * Creates an instance of DelegatedPlugin.
	 * @param {Options} options options
	 */
	constructor(options) {
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					DelegatedSourceDependency,
					normalModuleFactory
				);
			}
		);

		compiler.hooks.compile.tap(PLUGIN_NAME, ({ normalModuleFactory }) => {
			new DelegatedModuleFactoryPlugin({
				associatedObjectForCache: compiler.root,
				...this.options
			}).apply(normalModuleFactory);
		});
	}
}

module.exports = DelegatedPlugin;
