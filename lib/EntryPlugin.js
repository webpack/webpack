/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import EntryDependency from "./dependencies/EntryDependency.js";
/** @typedef {import("./Compiler.js").default} Compiler */
/** @typedef {import("./Entrypoint.js").EntryOptions} EntryOptions */

const PLUGIN_NAME = "EntryPlugin";

class EntryPlugin {
	/**
	 * An entry plugin which will handle creation of the EntryDependency
	 * @param {string} context context path
	 * @param {string} entry entry path
	 * @param {EntryOptions=} options entry options
	 */
	constructor(context, entry, options) {
		/** @type {string} */
		this.context = context;
		/** @type {string} */
		this.entry = entry;
		/** @type {EntryOptions} */
		this.options = options || {};
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
					EntryDependency,
					normalModuleFactory
				);
			}
		);

		const { entry, options, context } = this;
		const dep = EntryPlugin.createDependency(entry, options);

		compiler.hooks.make.tapAsync(PLUGIN_NAME, (compilation, callback) => {
			compilation.addEntry(context, dep, options, (err) => {
				callback(err);
			});
		});
	}

	/**
	 * Creates a dependency.
	 * @param {string} entry entry request
	 * @param {EntryOptions} options entry options
	 * @returns {EntryDependency} the dependency
	 */
	static createDependency(entry, options) {
		const dep = new EntryDependency(entry);
		dep.loc = { name: /** @type {string} */ (options.name) };
		return dep;
	}
}

export default EntryPlugin;

export { EntryPlugin as "module.exports" };
