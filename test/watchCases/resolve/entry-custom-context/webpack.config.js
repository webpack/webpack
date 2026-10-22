"use strict";

const path = require("path");
const { EntryPlugin } = require("../../../../");
const EntryDependency = require("../../../../lib/entry/EntryDependency");

const PLUGIN_NAME = "EntryCustomContextTest";

/**
 * Registers a fresh entry dependency with its own context on every make.
 * @param {import("../../../../").Compiler} compiler compiler
 * @returns {void}
 */
const addEntryWithOwnContext = (compiler) => {
	const context = path.resolve(compiler.context, "lib");

	compiler.hooks.compilation.tap(
		PLUGIN_NAME,
		(compilation, { normalModuleFactory }) => {
			compilation.dependencyFactories.set(
				/** @type {Parameters<typeof compilation.dependencyFactories.set>[0]} */
				(/** @type {unknown} */ (EntryDependency)),
				normalModuleFactory
			);
		}
	);
	compiler.hooks.make.tapAsync(PLUGIN_NAME, (compilation, callback) => {
		compilation.addEntry(
			context,
			EntryPlugin.createDependency("./index.js", { name: "main" }),
			{ name: "main" },
			(err) => callback(err)
		);
	});
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: {},
	output: {
		filename: "bundle.js"
	},
	module: {
		rules: [
			{
				test: /index\.js$/,
				use: path.resolve(__dirname, "loader.js")
			}
		]
	},
	plugins: [addEntryWithOwnContext]
};
