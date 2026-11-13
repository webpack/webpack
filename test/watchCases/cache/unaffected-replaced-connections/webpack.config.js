"use strict";

const assert = require("assert");
const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration[]} */
module.exports = ["memory", "filesystem"].map((type) => ({
	mode: "development",
	devtool: false,
	entry: {
		main: "./index.js",
		second: "./index.js",
		trigger: ["./imports.js", "./tick.js"]
	},
	cache: type === "memory" ? { type: "memory" } : { type: "filesystem" },
	experiments: { cacheUnaffected: true },
	output: { filename: `${type}-[name].js`, clean: false },
	plugins: [
		(compiler) => {
			const { ESMImportDependency } = compiler.webpack.dependencies;
			const originPath = path.join(compiler.context, "index.js");
			compiler.hooks.finishMake.tap("ReplaceConnections", (compilation) => {
				// Restore the parsed graph before the first affected-module pass.
				for (const module of compilation.modules) {
					if (module.nameForCondition() !== originPath) continue;
					for (
						let index = module.dependencies.length - 1;
						index >= 0;
						index--
					) {
						const dependency = module.dependencies[index];
						if (!(dependency instanceof ESMImportDependency)) continue;
						if (compilation.moduleGraph.getConnection(dependency)) {
							compilation.moduleGraph.removeConnection(dependency);
						}
						module.removeDependency(dependency);
					}
				}
			});
			compiler.hooks.compilation.tap("ReplaceConnections", (compilation) => {
				/** @type {import("webpack").Module | undefined} */
				let unchangedModule;
				let blockReads = 0;
				const { moduleGraph } = compilation;
				const getParentBlock = moduleGraph.getParentBlock;
				compilation.hooks.beforeChunks.tap("ReplaceConnections", () => {
					if (!compilation.moduleMemCaches) return;
					moduleGraph.getParentBlock = (dependency) => {
						if (moduleGraph.getParentModule(dependency) === unchangedModule) {
							blockReads++;
						}
						return getParentBlock.call(moduleGraph, dependency);
					};
				});
				compilation.hooks.afterChunks.tap("ReplaceConnections", () => {
					moduleGraph.getParentBlock = getParentBlock;
					if (!compilation.moduleMemCaches) return;
					if (currentWatchStep.step === "0" && blockReads === 0) {
						compilation.errors.push(
							new compiler.webpack.WebpackError(
								"The initial graph must be extracted"
							)
						);
					} else if (Number(currentWatchStep.step) >= 2 && blockReads !== 0) {
						compilation.errors.push(
							new compiler.webpack.WebpackError(
								`Unchanged modules must reuse their cached block connections (${blockReads} reads)`
							)
						);
					}
				});
				compilation.hooks.finishModules.tap("ReplaceConnections", (modules) => {
					const byPath = new Map(
						[...modules].map((module) => [module.nameForCondition(), module])
					);
					const origin = byPath.get(originPath);
					const imports = byPath.get(path.join(compiler.context, "imports.js"));
					assert(origin && imports);
					unchangedModule = imports;
					const sample = imports.dependencies.find(
						(dependency) => dependency instanceof ESMImportDependency
					);
					assert(sample);
					// Use the parser's concrete, serializable import dependency.
					const ImportDependency = /** @type {typeof ESMImportDependency} */ (
						sample.constructor
					);
					const targets = [
						["a", "b"],
						["a", "c"],
						["a", "c"],
						["a", "b"],
						["a", "b"],
						["a"],
						["a"],
						[],
						[]
					][Number(currentWatchStep.step)];
					for (const [index, name] of targets.entries()) {
						const request = `./${name}.js`;
						const target = byPath.get(path.join(compiler.context, request));
						assert(target);
						const dependency = new ImportDependency(request, index);
						origin.addDependency(dependency);
						compilation.moduleGraph.setParents(
							dependency,
							origin,
							origin,
							origin.dependencies.length - 1
						);
						compilation.moduleGraph.setResolvedModule(
							origin,
							dependency,
							target
						);
						if (index === 1) {
							const intermediate = byPath.get(
								path.join(compiler.context, "a.js")
							);
							assert(intermediate);
							compilation.moduleGraph.updateModule(dependency, intermediate);
							compilation.moduleGraph.updateModule(dependency, target);
						}
					}
				});
			});
		}
	]
}));
