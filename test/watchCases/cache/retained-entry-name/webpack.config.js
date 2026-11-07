"use strict";

const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration} */
module.exports = {
	entry: { bundle: "./index.js" },
	output: { filename: "[name].js" },
	plugins: [
		(compiler) => {
			const dependency = compiler.webpack.EntryPlugin.createDependency(
				"./side.js",
				{ name: "first" }
			);
			compiler.hooks.make.tapAsync(
				"RetainedEntryName",
				(compilation, callback) => {
					const step = Number(currentWatchStep.step);
					const name = [
						"first",
						"second",
						"third",
						undefined,
						"shared",
						"last"
					][step];
					if (step === 2 || step === 3) {
						compilation.addInclude(
							compiler.context,
							dependency,
							{ name },
							callback
						);
					} else {
						compilation.addEntry(
							compiler.context,
							dependency,
							{ name },
							(error) => {
								if (error || step !== 4) return callback(error);
								compilation.addEntry(
									compiler.context,
									dependency,
									{ name: "second" },
									callback
								);
							}
						);
					}
				}
			);
			compiler.hooks.finishMake.tap("RetainedEntryName", (compilation) => {
				const step = Number(currentWatchStep.step);
				const names = [
					["first"],
					["second"],
					["third"],
					[],
					["shared", "second"],
					["last"]
				][step];
				expect([...compilation.entries.keys()].sort()).toEqual(
					["bundle", ...names].sort()
				);
				for (const name of names) {
					const entry = compilation.entries.get(name);
					expect(entry.dependencies).toEqual(step === 2 ? [] : [dependency]);
					expect(entry.includeDependencies).toEqual(
						step === 2 ? [dependency] : []
					);
				}
				expect(compilation.globalEntry.includeDependencies).toEqual(
					step === 3 ? [dependency] : []
				);
				expect(compilation.moduleGraph.getModule(dependency)).toBeDefined();
			});
		}
	]
};
