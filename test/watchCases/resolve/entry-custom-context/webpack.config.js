"use strict";

const path = require("path");
const { EntryPlugin } = require("../../../../");
const EntryDependency = require("../../../../lib/dependencies/EntryDependency");

const PLUGIN_NAME = "EntryCustomContextTest";

/**
 * Registers the entry with a context of its own, building a fresh dependency
 * every make the way HtmlModulesPlugin does. Re-factorizing on a rebuild must
 * reuse that context, not the compiler's, and must find it on the persisted
 * dependency the incremental path retains in place of the fresh one.
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
				// a loader makes the entry re-runnable through the factory pipeline
				test: /index\.js$/,
				use: path.resolve(__dirname, "loader.js")
			}
		]
	},
	plugins: [addEntryWithOwnContext]
};
