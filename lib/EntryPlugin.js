/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const EntryDependency = require("./dependencies/EntryDependency");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Entrypoint").EntryOptions} EntryOptions */

class EntryPlugin {
	/**
	 * An entry plugin which will handle creation of the EntryDependency
	 * @param {string} context context path
	 * @param {string} entry entry path
	 * @param {EntryOptions | string=} options entry options (passing a string is deprecated)
	 */
	constructor(context, entry, options) {
		this.context = context;
		this.entry = entry;
		this.options = options || "";
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"EntryPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					EntryDependency,
					normalModuleFactory
				);
			}
		);

		const { entry, options, context } = this;
		const dep = EntryPlugin.createDependency(entry, options);

		compiler.hooks.make.tapAsync("EntryPlugin", (compilation, callback) => {
			compilation.addEntry(context, dep, options, err => {
				if (err) return callback(err);

				if (typeof options === "object" && options.dependOn) {
					const entryName = options.name || /** @type {any} */ (dep.loc).name;
					const currentEntrypoint = compilation.entrypoints.get(entryName);
					const entryModule = compilation.moduleGraph.getModule(dep);

					if (currentEntrypoint && entryModule) {
						for (const depEntry of options.dependOn) {
							const depEntrypoint = compilation.entrypoints.get(depEntry);
							if (depEntrypoint) {
								currentEntrypoint.addParent(depEntrypoint);
								for (const currentChunk of depEntrypoint.chunks) {
									compilation.chunkGraph.connectChunkAndEntryModule(
										currentChunk,
										entryModule,
										currentEntrypoint
									);
								}
							}
						}
					}
				}
				callback();
			});
		});
	}

	/**
	 * @param {string} entry entry request
	 * @param {EntryOptions | string} options entry options (passing string is deprecated)
	 * @returns {EntryDependency} the dependency
	 */
	static createDependency(entry, options) {
		const dep = new EntryDependency(entry);
		// TODO webpack 6 remove string option
		dep.loc = {
			name:
				typeof options === "object"
					? /** @type {string} */ (options.name)
					: options
		};
		return dep;
	}
}

module.exports = EntryPlugin;
