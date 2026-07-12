/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import DelegatedSourceDependency from "../dependencies/DelegatedSourceDependency.js";
import DelegatedModuleFactoryPlugin from "./DelegatedModuleFactoryPlugin.js";
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("./DelegatedModuleFactoryPlugin.js").Options} Options */

const PLUGIN_NAME = "DelegatedPlugin";

class DelegatedPlugin {
	/**
	 * Creates an instance of DelegatedPlugin.
	 * @param {Options} options options
	 */
	constructor(options) {
		/** @type {Options} */
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

export default DelegatedPlugin;

export { DelegatedPlugin as "module.exports" };
