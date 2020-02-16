/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../declarations/WebpackOptions").Entry} Entry */
/** @typedef {import("../declarations/WebpackOptions").EntryDescription} EntryDescription */
/** @typedef {import("../declarations/WebpackOptions").EntryItem} EntryItem */
/** @typedef {import("../declarations/WebpackOptions").EntryStatic} EntryStatic */
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
				EntryOptionPlugin.processEntryStatic(entry, (entry, options) => {
					new EntryPlugin(context, entry, options).apply(compiler);
				});
			}
			return true;
		});
	}

	/**
	 * @param {EntryStatic} entry entry array or single path
	 * @param {function(string, EntryOptions): void} onEntry callback for each entry
	 * @returns {void}
	 */
	static processEntryStatic(entry, onEntry) {
		/**
		 * @param {EntryItem} entry entry array or single path
		 * @param {EntryOptions} options entry options
		 * @returns {void}
		 */
		const applyEntryItemPlugins = (entry, options) => {
			if (typeof entry === "string") {
				onEntry(entry, options);
			} else if (Array.isArray(entry)) {
				for (const item of entry) {
					applyEntryItemPlugins(item, options);
				}
			}
		};

		/**
		 * @param {EntryDescription} entry entry array or single path
		 * @param {EntryOptions} options entry options
		 * @returns {void}
		 */
		const applyEntryDescriptionPlugins = (entry, options) => {
			let dependOn = undefined;
			if (entry.dependOn) {
				dependOn = Array.isArray(entry.dependOn)
					? Array.from(entry.dependOn)
					: [entry.dependOn];
			}
			applyEntryItemPlugins(entry.import, {
				...options,
				dependOn,
				filename: entry.filename
			});
		};

		if (typeof entry === "string" || Array.isArray(entry)) {
			applyEntryItemPlugins(entry, { name: "main" });
		} else if (entry && typeof entry === "object") {
			for (const name of Object.keys(entry)) {
				const value = entry[name];
				if (typeof value === "string" || Array.isArray(value)) {
					applyEntryItemPlugins(value, { name });
				} else {
					applyEntryDescriptionPlugins(value, { name });
				}
			}
		}
	}
}

module.exports = EntryOptionPlugin;
