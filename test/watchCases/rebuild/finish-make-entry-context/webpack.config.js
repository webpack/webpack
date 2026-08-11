"use strict";

const path = require("path");
const { EntryPlugin } = require("../../../../");
const EntryDependency = require("../../../../lib/dependencies/EntryDependency");

const PLUGIN_NAME = "FinishMakeEntryContextTest";

/**
 * Registers the entry from finishMake with a context of its own, the way
 * HtmlModulesPlugin registers page entries. _incrementalMake runs before
 * finishMake, so a rebuild must still re-resolve against that context.
 * @param {import("../../../../").Compiler} compiler compiler
 * @returns {void}
 */
const addEntryFromFinishMake = (compiler) => {
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
	compiler.hooks.finishMake.tapAsync(PLUGIN_NAME, (compilation, callback) => {
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
	plugins: [addEntryFromFinishMake]
};
