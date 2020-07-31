/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Compiler")} Compiler */

class RuntimeChunkPlugin {
	constructor(options) {
		this.options = {
			name: entrypoint => `runtime~${entrypoint.name}`,
			...options
		};
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap("RuntimeChunkPlugin", compilation => {
			compilation.hooks.addEntry.tap(
				"RuntimeChunkPlugin",
				(_, { name: entryName }) => {
					const data = compilation.entries.get(entryName);
					if (!data.options.runtime && !data.options.dependOn) {
						// Determine runtime chunk name
						let name = this.options.name;
						if (typeof name === "function") {
							name = name({ name: entryName });
						}
						data.options.runtime = name;
					}
				}
			);
		});
	}
}

module.exports = RuntimeChunkPlugin;
