/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const DynamicEntryPlugin = require("./DynamicEntryPlugin");
const EntryPlugin = require("./EntryPlugin");

/** @typedef {import("../declarations/WebpackOptions").EntryItem} EntryItem */
/** @typedef {import("./Compiler")} Compiler */

module.exports = class EntryOptionPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance one is tapping into
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.entryOption.tap("EntryOptionPlugin", (context, entry) => {
			/**
			 * @param {EntryItem} entry entry array or single path
			 * @param {string} name entry key name
			 * @returns {void}
			 */
			const applyEntryPlugins = (entry, name) => {
				if (typeof entry === "string") {
					new EntryPlugin(context, entry, name).apply(compiler);
				} else if (Array.isArray(entry)) {
					for (const item of entry) {
						applyEntryPlugins(item, name);
					}
				}
			};

			if (typeof entry === "string" || Array.isArray(entry)) {
				applyEntryPlugins(entry, "main");
			} else if (typeof entry === "object") {
				for (const name of Object.keys(entry)) {
					applyEntryPlugins(entry[name], name);
				}
			} else if (typeof entry === "function") {
				new DynamicEntryPlugin(context, entry).apply(compiler);
			}
			return true;
		});
	}
};
