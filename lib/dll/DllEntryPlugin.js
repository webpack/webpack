/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import DllEntryDependency from "../dependencies/DllEntryDependency.js";
import EntryDependency from "../dependencies/EntryDependency.js";
import DllModuleFactory from "./DllModuleFactory.js";
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("../Entrypoint.js").EntryOptions} EntryOptions */

/** @typedef {string[]} Entries */
/** @typedef {EntryOptions & { name: string }} Options */

const PLUGIN_NAME = "DllEntryPlugin";

class DllEntryPlugin {
	/**
	 * Creates an instance of DllEntryPlugin.
	 * @param {string} context context
	 * @param {Entries} entries entry names
	 * @param {Options} options options
	 */
	constructor(context, entries, options) {
		/** @type {string} */
		this.context = context;
		/** @type {Entries} */
		this.entries = entries;
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
				const dllModuleFactory = new DllModuleFactory();
				compilation.dependencyFactories.set(
					DllEntryDependency,
					dllModuleFactory
				);
				compilation.dependencyFactories.set(
					EntryDependency,
					normalModuleFactory
				);
			}
		);
		compiler.hooks.make.tapAsync(PLUGIN_NAME, (compilation, callback) => {
			compilation.addEntry(
				this.context,
				new DllEntryDependency(
					this.entries.map((e, idx) => {
						const dep = new EntryDependency(e);
						dep.loc = {
							name: this.options.name,
							index: idx
						};
						return dep;
					}),
					this.options.name
				),
				this.options,
				(error) => {
					if (error) return callback(error);
					callback();
				}
			);
		});
	}
}

export default DllEntryPlugin;

export { DllEntryPlugin as "module.exports" };
