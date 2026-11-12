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
					dependency.request =
						currentWatchStep.step === "6" ? "./other.js" : "./index.js";
					const layer =
						currentWatchStep.step === "3"
							? "first"
							: currentWatchStep.step === "4"
								? "second"
								: undefined;
					compilation.addEntry(
						path.join(
							compiler.context,
							currentWatchStep.step === "1" ? "b" : "a"
						),
						dependency,
						{ ...options, layer },
						(error) => callback(error)
					);
				}
			);
			compiler.hooks.finishMake.tap("RetainedEntryContext", (compilation) => {
				const entryPaths = ["a/index.js", "b/index.js", "a/other.js"].map(
					(file) => path.join(compiler.context, file)
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
					entryPaths[
						currentWatchStep.step === "1"
							? 1
							: currentWatchStep.step === "6"
								? 2
								: 0
					]
				);
				expect(compilation.entries.get("main")).toHaveProperty("dependencies", [
					dependency
				]);
				for (const module of compilation.modules) {
					expect(module.layer).toBe(entries[0].layer);
				}
			});
		}
	]
}));
