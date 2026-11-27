"use strict";

/** @import { Dependency, ModuleGraph } from "../../../../" */
/** @typedef {Exclude<ReturnType<Dependency["getCondition"]>, null | false>} GetConditionFn */
/**
 * @typedef {Dependency & {
 * ids: string[],
 * getIds(moduleGraph: ModuleGraph): string[],
 * setIds(moduleGraph: ModuleGraph, ids: string[]): void,
 * }} ReexportDependency
 */
/**
 * @typedef {ReexportDependency & {
 * otherStarExports: readonly ReexportDependency[] | null,
 * _otherStarExports: readonly ReexportDependency[] | number | null,
 * allStarExports: { dependencies: ReexportDependency[] } | null,
 * _discoverActiveExportsFromOtherStarExports(moduleGraph: ModuleGraph): { dependencyIndex: number } | undefined
 * }} StarReexportDependency
 */

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		concatenateModules: false,
		inlineExports: false,
		minimize: false
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("DependencyAllocation", (compilation) => {
				compilation.hooks.finishModules.tap(
					"DependencyAllocation",
					(modules) => {
						const graph = new compiler.webpack.ModuleGraph();
						const otherGraph = new compiler.webpack.ModuleGraph();
						/** @type {Map<string, GetConditionFn>} */
						const conditions = new Map();
						/** @type {Map<string, number>} */
						const counts = new Map();
						let reexports = 0;
						for (const module of modules) {
							for (const dependency of module.dependencies) {
								if (
									dependency.type === "harmony export imported specifier" ||
									dependency.type === "cjs export require"
								) {
									const dep = /** @type {ReexportDependency} */ (dependency);
									expect(dep.getIds(graph)).toBe(dep.ids);
									expect(graph.getMetaIfExisting(dep)).toBeUndefined();
									graph.getMeta(dep);
									expect(dep.getIds(graph)).toBe(dep.ids);
									const ids = ["replacement"];
									dep.setIds(graph, ids);
									expect(dep.getIds(graph)).toBe(ids);
									dep.setIds(graph, []);
									expect(dep.getIds(graph)).toEqual([]);
									expect(dep.getIds(otherGraph)).toBe(dep.ids);
									reexports++;
									if (dep.is("esm-reexport") && dep.ids.length === 0) {
										const star = /** @type {StarReexportDependency} */ (dep);
										const all = star.allStarExports;
										if (!all) throw new Error("Missing star export list");
										const index = all.dependencies.indexOf(star);
										if (module.identifier().endsWith("?legacy")) {
											const earlier = star.otherStarExports;
											expect(earlier).toEqual(all.dependencies.slice(0, index));
											expect(star.otherStarExports).toBe(earlier);
											star.otherStarExports = earlier;
											star.allStarExports = null;
											const discovered =
												star._discoverActiveExportsFromOtherStarExports(
													compilation.moduleGraph
												);
											expect(discovered && discovered.dependencyIndex).toBe(
												index === 0 ? undefined : index
											);
											star.allStarExports = all;
										} else {
											expect(star._otherStarExports).toBe(index);
										}
									}
								}
								if (
									dependency.type !== "harmony side effect evaluation" &&
									dependency.type !== "harmony export imported specifier"
								) {
									continue;
								}
								const condition = dependency.getCondition(
									compilation.moduleGraph
								);
								expect(typeof condition).toBe("function");
								if (typeof condition !== "function") {
									throw new Error("Expected a conditional dependency");
								}
								const name = dependency.constructor.name;
								const previous = conditions.get(name);
								if (previous !== undefined) expect(condition).toBe(previous);
								conditions.set(name, condition);
								counts.set(name, (counts.get(name) || 0) + 1);
								expect(dependency.getCondition(compilation.moduleGraph)).toBe(
									condition
								);
								expect(dependency.getCondition(otherGraph)).not.toBe(condition);
							}
						}
						expect(reexports).toBe(11);
						expect(
							conditions.get("ESMExportImportedSideEffectDependency")
						).toBe(conditions.get("ESMImportSideEffectDependency"));
						for (const name of [
							"ESMImportSideEffectDependency",
							"ESMImportBareSideEffectDependency",
							"ESMExportImportedSpecifierDependency"
						]) {
							expect(counts.get(name)).toBeGreaterThanOrEqual(2);
						}
					}
				);
			});
		}
	]
};
