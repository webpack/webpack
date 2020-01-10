/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const neoasync = require("neo-async");
const EntryDependency = require("./dependencies/EntryDependency");
const EntryStatPlugin = require("./EntryStatPlugin");

/** @typedef {import("../declarations/WebpackOptions").EntryItem} EntryItem */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Compilation")} Compilation */

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
		this.dependOn = dependOn || [];

		if (!Array.isArray(this.dependOn)) {
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

			this.waitDeps(compilation, () => {
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
	 * @param {function} callback callback that will be executed when all the deps will built
	 */
	waitDeps(compilation, callback) {
		if (!this.dependOn.length) {
			callback();
			return;
		}

		neoasync.forEach(
			this.dependOn,
			(dependOnName, callback) => {
				EntryStatPlugin.onEntrySuccess(compilation, dependOnName, callback);
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
