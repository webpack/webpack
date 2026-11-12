"use strict";

const assert = require("assert");
const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration[]} */
module.exports = [false, true].map((cache, index) => ({
	cache: cache ? { type: "memory" } : false,
	entry: {},
	output: { filename: `[name]${index}.js`, clean: false },
	plugins: [
		(compiler) => {
			/** @type {WeakMap<import("webpack").Compilation, number>} */
			const hookValues = new WeakMap();
			let pendingRebuildRequested = false;
			let pendingRebuildFinished = false;
			const options = { name: "main" };
			const dependency = compiler.webpack.EntryPlugin.createDependency(
				"./index.js",
				options
			);
			/**
			 * @param {import("webpack").Compilation} compilation current compilation
			 * @param {import("webpack").Module} entryModule built entry
			 * @returns {number} value from the reachable leaf
			 */
			const readLeaf = (compilation, entryModule) => {
				const reachable = new Set([entryModule]);
				for (const module of reachable) {
					for (const connection of compilation.moduleGraph.getOutgoingConnections(
						module
					)) {
						if (connection.module) reachable.add(connection.module);
					}
				}
				const leaf = [...reachable].find(
					(module) =>
						/** @type {import("webpack").NormalModule} */ (module).resource ===
						path.join(compiler.context, "leaf.json")
				);
				assert(leaf);
				const source = leaf.originalSource();
				assert(source);
				const data = /** @type {{ value: number }} */ (
					JSON.parse(source.source().toString())
				);
				return data.value;
			};
			compiler.hooks.compilation.tap(
				"EntryTreeReadiness",
				(compilation, { normalModuleFactory }) => {
					compiler.webpack.NormalModule.getCompilationHooks(
						compilation
					).needBuild.tapAsync(
						"EntryTreeReadiness",
						(module, context, callback) => {
							if (
								!cache ||
								!compiler.watchMode ||
								currentWatchStep.step !== "2" ||
								module.resource !== path.join(compiler.context, "right.js") ||
								pendingRebuildRequested
							) {
								return callback();
							}
							pendingRebuildRequested = true;
							compilation.rebuildModule(module, (error) => {
								pendingRebuildFinished = !error;
								callback(error);
							});
						}
					);
					compilation.hooks.finishModules.tap("EntryTreeReadiness", () => {
						if (cache && compiler.watchMode && currentWatchStep.step === "2") {
							expect(pendingRebuildRequested).toBe(true);
							expect(pendingRebuildFinished).toBe(true);
						}
					});
					compilation.dependencyFactories.set(
						compiler.webpack.dependencies.EntryDependency,
						normalModuleFactory
					);
					compilation.hooks.succeedEntry.tap(
						"EntryTreeReadiness",
						(entry, entryOptions, module) => {
							if (entryOptions.name === "main") {
								hookValues.set(compilation, readLeaf(compilation, module));
							}
						}
					);
				}
			);
			compiler.hooks.make.tapAsync(
				"EntryTreeReadiness",
				(compilation, callback) => {
					compilation.addEntry(
						compiler.context,
						dependency,
						options,
						(error, module) => {
							if (error) return callback(error);
							assert(module);
							compilation.emitAsset(
								`entry-tree${index}.json`,
								new compiler.webpack.sources.RawSource(
									JSON.stringify([
										hookValues.get(compilation),
										readLeaf(compilation, module)
									])
								)
							);
							callback();
						}
					);
				}
			);
			new compiler.webpack.EntryPlugin(compiler.context, "./other.js", {
				name: "other"
			}).apply(compiler);
		}
	]
}));
