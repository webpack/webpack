/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const neoasync = require("neo-async");
const EntryStatPlugin = require("./EntryStatPlugin");
const EntryDependency = require("./dependencies/EntryDependency");

/** @typedef {import("../declarations/WebpackOptions").EntryItem} EntryItem */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Compiler")} Compiler */

class EntryPlugin {
	/**
	 * An entry plugin which will handle
	 * creation of the EntryDependency
	 *
	 * @param {string} context context path
	 * @param {string} entry entry path
	 * @param {string} name entry key name
	 * @param {EntryItem} [dependOn] depend on entries
	 */
	constructor(context, entry, name, dependOn) {
		this.context = context;
		this.entry = entry;
		this.name = name;
		this.dependOn = dependOn;

		if (dependOn !== undefined && !Array.isArray(this.dependOn)) {
			this.dependOn = [this.dependOn];
		}
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"EntryPlugin",
			(compilation, { normalModuleFactory }) => {
				const { entry, name } = this;

				EntryStatPlugin.registerEntry(compilation, name, entry);

				compilation.dependencyFactories.set(
					EntryDependency,
					normalModuleFactory
				);
			}
		);

		compiler.hooks.make.tapAsync("EntryPlugin", (compilation, callback) => {
			const { entry, name, context } = this;

			EntryPlugin.waitDeps(compilation, this.dependOn, () => {
				const dep = EntryPlugin.createDependency(entry, name);
				compilation.addEntry(context, dep, name, err => {
					callback(err);
				});
			});
		});
	}

	/**
	 * Wait until entry deps will built
	 * @param {Compilation} compilation compilation
	 * @param {EntryItem} dependOn depend on entrypoints
	 * @param {function} callback callback that will be executed when all the deps will built
	 */
	static waitDeps(compilation, dependOn, callback) {
		if (!dependOn || !dependOn.length) {
			callback();
			return;
		}

		neoasync.forEach(
			dependOn,
			(dependOnName, callback) => {
				EntryStatPlugin.onEntrySuccess(compilation, dependOnName, () =>
					callback()
				);
			},
			() => callback()
		);
	}

	/**
	 * @param {string} entry entry request
	 * @param {string} name entry name
	 * @returns {EntryDependency} the dependency
	 */
	static createDependency(entry, name) {
		const dep = new EntryDependency(entry);
		dep.loc = { name };
		return dep;
	}
}

module.exports = EntryPlugin;
