"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration[]} */
module.exports = [false, true].map((concatenateModules, index) => ({
	mode: "development",
	entry: {},
	output: { filename: `bundle${index}.js`, clean: false },
	optimization: { concatenateModules },
	plugins: [
		(compiler) => {
			const { EntryPlugin, dependencies } = compiler.webpack;
			const options = { name: "main" };
			const dependency = EntryPlugin.createDependency("./index.js", options);
			compiler.hooks.compilation.tap(
				"RetainedEntryContext",
				(compilation, { normalModuleFactory }) => {
					compilation.dependencyFactories.set(
						dependencies.EntryDependency,
						normalModuleFactory
					);
				}
			);
			compiler.hooks.make.tapAsync(
				"RetainedEntryContext",
				(compilation, callback) => {
					compilation.addEntry(
						path.join(
							compiler.context,
							currentWatchStep.step === "1" ? "b" : "a"
						),
						dependency,
						options,
						(error) => callback(error)
					);
				}
			);
			compiler.hooks.finishMake.tap("RetainedEntryContext", (compilation) => {
				const entryPaths = ["a", "b"].map((directory) =>
					path.join(compiler.context, directory, "index.js")
				);
				const entries = [...compilation.modules].filter(
					(module) =>
						module.is("normal") &&
						entryPaths.includes(
							/** @type {import("webpack").NormalModule} */ (module).resource
						)
				);
				expect(entries).toHaveLength(1);
				expect(entries[0]).toHaveProperty(
					"resource",
					entryPaths[currentWatchStep.step === "1" ? 1 : 0]
				);
				expect(compilation.entries.get("main")).toHaveProperty("dependencies", [
					dependency
				]);
			});
		}
	]
}));
