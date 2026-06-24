/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sebastian Beltran @bjohansebas
*/

"use strict";

const EntryDependency = require("./dependencies/EntryDependency");
const WorkerAndWorkletPlugin = require("./dependencies/WorkerAndWorkletPlugin");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Entrypoint").EntryOptions} EntryOptions */

const PLUGIN_NAME = "WorkerEntryPlugin";

/**
 * Adds an entry that runs inside every Web Worker entrypoint — the worker
 * counterpart of EntryPlugin's global entry (which only reaches the document's
 * entrypoints). Used e.g. to inject an HMR client into workers.
 */
class WorkerEntryPlugin {
	/**
	 * @param {string} context context path
	 * @param {string} entry entry request
	 * @param {EntryOptions | string=} options entry options (passing a string is deprecated)
	 */
	constructor(context, entry, options) {
		/** @type {string} */
		this.context = context;
		/** @type {string} */
		this.entry = entry;
		this.options = options || "";
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const { entry, options } = this;
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			WorkerAndWorkletPlugin.getCompilationHooks(
				compilation
			).additionalEntries.tap(
				PLUGIN_NAME,
				(dependencies) => {
					const dep = new EntryDependency(entry);
					dep.loc = {
						name:
							typeof options === "object"
								? /** @type {string} */ (options.name)
								: options
					};
					dependencies.push(dep);

					return dependencies;
				}
			);
		});
	}
}

module.exports = WorkerEntryPlugin;
