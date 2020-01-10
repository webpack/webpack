/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Naoyuki Kanezawa @nkzawa
*/

"use strict";

const EntryPlugin = require("./EntryPlugin");
const EntryStatPlugin = require("./EntryStatPlugin");
const EntryDependency = require("./dependencies/EntryDependency");

/** @typedef {import("../declarations/WebpackOptions").EntryDescription} EntryDescription */
/** @typedef {import("../declarations/WebpackOptions").EntryDynamic} EntryDynamic */
/** @typedef {import("../declarations/WebpackOptions").EntryItem} EntryItem */
/** @typedef {import("../declarations/WebpackOptions").EntryStatic} EntryStatic */
/** @typedef {import("./Compiler")} Compiler */

class DynamicEntryPlugin {
	/**
	 * @param {string} context the context path
	 * @param {EntryDynamic} entry the entry value
	 */
	constructor(context, entry) {
		this.context = context;
		this.entry = entry;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"DynamicEntryPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					EntryDependency,
					normalModuleFactory
				);
			}
		);

		compiler.hooks.make.tapAsync(
			"DynamicEntryPlugin",
			(compilation, callback) => {
				/**
				 * @param {string|string[]} entry entry value or array of entry values
				 * @param {string} name name of entry
				 * @returns {Promise<EntryStatic>} returns the promise resolving the Compilation#addEntry function
				 */
				const addEntry = (entry, name) => {
					const deps = DynamicEntryPlugin.createDependencies(entry, name);
					return new Promise((resolve, reject) => {
						for (const dep of deps) {
							compilation.addEntry(this.context, dep, name, err => {
								if (err) return reject(err);
								resolve();
							});
						}
					});
				};

				Promise.resolve(this.entry()).then(entry => {
					if (typeof entry === "string" || Array.isArray(entry)) {
						addEntry(entry, "main").then(() => {
							callback();
						}, callback);
					} else if (typeof entry === "object") {
						Object.keys(entry).map(name => {
							const entryItem = /** @type {EntryDescription} */ (entry[name]);
							const imports = Array.isArray(entryItem.import)
								? entryItem.import
								: [entryItem.import];

							for (const importItem of imports) {
								EntryStatPlugin.registerEntry(compilation, name, importItem);
							}
						});

						Promise.all(
							Object.keys(entry).map(name => {
								if (
									typeof entry[name] === "string" ||
									Array.isArray(entry[name])
								) {
									const entryItem =
										/** @type {string|string[]} */ (entry[name]);
									return addEntry(entryItem, name);
								} else if (typeof entry[name] === "object") {
									return new Promise(resolve => {
										const entryItem =
											/** @type {EntryDescription} */ (entry[name]);
										EntryPlugin.waitDeps(
											compilation,
											entryItem.dependOn,
											() => {
												addEntry(entryItem.import, name).then(resolve);
											}
										);
									});
								}
							})
						).then(() => {
							callback();
						}, callback);
					}
				}, callback);
			}
		);
	}

	/**
	 * @param {string|string[]} entry entry value or array of entry paths
	 * @param {string} name name of entry
	 * @returns {EntryDependency[]} dependencies
	 */
	static createDependencies(entry, name) {
		const entryArray = Array.isArray(entry) ? entry : [entry];
		return entryArray.map(entry => EntryPlugin.createDependency(entry, name));
	}
}

module.exports = DynamicEntryPlugin;
