"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/**
 * @param {import("webpack").Module | null | undefined} module entry module
 * @returns {string} built source
 */
const getEntrySource = (module) => {
	assert(module);
	const source = module.originalSource();
	assert(source);
	return source.source().toString();
};

/** @type {import("webpack").Configuration[]} */
module.exports = [false, true].map((cache, index) => ({
	cache: cache ? { type: "memory" } : false,
	entry: {},
	output: { filename: `bundle${index}.js`, clean: false },
	module: {
		rules: [
			{
				test: /index\.js$/,
				loader: path.resolve(__dirname, "loader.js"),
				options: { cacheable: cache }
			}
		]
	},
	plugins: [
		(compiler) => {
			/** @type {WeakMap<import("webpack").Compilation, string[]>} */
			const observedSources = new WeakMap();
			const options = { name: "main" };
			const dependency = compiler.webpack.EntryPlugin.createDependency(
				"./index.js",
				options
			);
			compiler.hooks.compilation.tap(
				"CheckEntryBuild",
				(compilation, { normalModuleFactory }) => {
					/** @type {string[]} */
					const sources = [];
					observedSources.set(compilation, sources);
					compilation.dependencyFactories.set(
						compiler.webpack.dependencies.EntryDependency,
						normalModuleFactory
					);
					let entryBuilds = 0;
					compilation.hooks.succeedModule.tap("CheckEntryBuild", (module) => {
						if (
							/** @type {import("webpack").NormalModule} */ (module)
								.resource === path.join(compiler.context, "index.js")
						) {
							entryBuilds++;
						}
					});
					compilation.hooks.succeedEntry.tap(
						"CheckEntryBuild",
						(entry, entryOptions, module) => {
							sources.push(getEntrySource(module));
							module.clearWarningsAndErrors();
							if (
								currentWatchStep.step === "1" ||
								currentWatchStep.step === "8"
							) {
								module.addWarning(
									new compiler.webpack.WebpackError(
										"Entry warning after rebuild"
									)
								);
							}
							if (currentWatchStep.step === "2") {
								module.addError(
									new compiler.webpack.WebpackError("Entry error after rebuild")
								);
							}
						}
					);
					compilation.hooks.finishModules.tap("CheckEntryBuild", () => {
						const source = fs.readFileSync(
							path.join(compiler.context, "index.js"),
							"utf8"
						);
						expect(sources).toEqual([source, source]);
						expect(entryBuilds).toBeLessThanOrEqual(1);
						if (
							!cache ||
							!compiler.watchMode ||
							Number(currentWatchStep.step) < 4 ||
							currentWatchStep.step === "5"
						) {
							expect(entryBuilds).toBe(1);
						} else if (currentWatchStep.step === "4") {
							expect(entryBuilds).toBe(0);
						}
					});
				}
			);
			compiler.hooks.make.tapAsync(
				"CheckEntryBuild",
				(compilation, callback) => {
					/** @returns {void} */
					const addEntry = () =>
						compilation.addEntry(
							compiler.context,
							dependency,
							options,
							(error, module) => {
								if (error) return callback(error);
								const sources = observedSources.get(compilation);
								assert(sources);
								sources.push(getEntrySource(module));
								callback();
							}
						);
					if (currentWatchStep.step === "8") {
						compilation.addModuleTree(
							{
								context: compiler.context,
								dependency: compiler.webpack.EntryPlugin.createDependency(
									"./index.js",
									options
								)
							},
							(error) => (error ? callback(error) : addEntry())
						);
					} else {
						addEntry();
					}
				}
			);
		}
	]
}));
