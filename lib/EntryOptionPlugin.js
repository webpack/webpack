/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../declarations/WebpackOptions").EntryDescriptionNormalized} EntryDescription */
/** @typedef {import("./Compilation").EntryOptions} EntryOptions */
/** @typedef {import("./Compiler")} Compiler */

class EntryOptionPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance one is tapping into
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.entryOption.tap("EntryOptionPlugin", (context, entry) => {
			if (typeof entry === "function") {
				const DynamicEntryPlugin = require("./DynamicEntryPlugin");
				new DynamicEntryPlugin(context, entry).apply(compiler);
			} else {
				const EntryPlugin = require("./EntryPlugin");
				for (const name of Object.keys(entry)) {
					const desc = entry[name];
					const options = EntryOptionPlugin.entryDescriptionToOptions(
						name,
						desc
					);
					for (const entry of desc.import) {
						new EntryPlugin(context, entry, options).apply(compiler);
					}
				}
			}
			return true;
		});
	}

	/**
	 * @param {string} name entry name
	 * @param {EntryDescription} desc entry description
	 * @returns {EntryOptions} options for the entry
	 */
	static entryDescriptionToOptions(name, desc) {
		/** @type {EntryOptions} */
		const options = {
			name,
			filename: desc.filename,
			dependOn: desc.dependOn
		};
		return options;
	}
}

module.exports = EntryOptionPlugin;
