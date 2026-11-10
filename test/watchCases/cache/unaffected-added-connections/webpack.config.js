"use strict";

const assert = require("assert");
const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration[]} */
module.exports = ["memory", "filesystem"].map((type) => ({
	mode: "development",
	devtool: false,
	entry: { main: "./index.js", trigger: ["./imports.js", "./tick.js"] },
	cache: type === "memory" ? { type: "memory" } : { type: "filesystem" },
	experiments: { cacheUnaffected: true },
	output: { filename: `${type}-[name].js`, clean: false },
	plugins: [
		(compiler) => {
			const { ESMImportDependency } = compiler.webpack.dependencies;
			const originPath = path.join(compiler.context, "index.js");
			compiler.hooks.finishMake.tap("AddConnections", (compilation) => {
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
			compiler.hooks.compilation.tap("AddConnections", (compilation) => {
				compilation.hooks.finishModules.tap("AddConnections", (modules) => {
					const byPath = new Map(
						[...modules].map((module) => [module.nameForCondition(), module])
					);
					const origin = byPath.get(originPath);
					const imports = byPath.get(path.join(compiler.context, "imports.js"));
					assert(origin && imports);
					const sample = imports.dependencies.find(
						(dependency) => dependency instanceof ESMImportDependency
					);
					assert(sample);
					// Use the parser's concrete, serializable import dependency.
					const ImportDependency = /** @type {typeof ESMImportDependency} */ (
						sample.constructor
					);
					const targets = [[], ["a"], ["a", "b"], ["a", "b"], ["a"], [], []][
						Number(currentWatchStep.step)
					];
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
					}
				});
			});
		}
	]
}));
