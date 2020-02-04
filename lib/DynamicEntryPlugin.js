/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Naoyuki Kanezawa @nkzawa
*/

"use strict";

const EntryOptionPlugin = require("./EntryOptionPlugin");
const EntryPlugin = require("./EntryPlugin");
const EntryDependency = require("./dependencies/EntryDependency");

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

		compiler.hooks.make.tapPromise(
			"DynamicEntryPlugin",
			(compilation, callback) =>
				Promise.resolve(this.entry())
					.then(entry => {
						const promises = [];
						EntryOptionPlugin.processEntryStatic(entry, (entry, options) => {
							promises.push(
								new Promise((resolve, reject) => {
									compilation.addEntry(
										this.context,
										EntryPlugin.createDependency(entry, options),
										options,
										err => {
											if (err) return reject(err);
											resolve();
										}
									);
								})
							);
						});
						return Promise.all(promises);
					})
					.then(x => {})
		);
	}
}

module.exports = DynamicEntryPlugin;
