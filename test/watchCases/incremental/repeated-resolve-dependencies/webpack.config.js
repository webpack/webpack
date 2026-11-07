"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @import Compilation from "../../../../lib/Compilation" */
/** @import Module from "../../../../lib/module/Module" */
/** @import LazySet from "../../../../lib/util/LazySet" */

/**
 * Counts nested lazy sets without materializing their contents.
 * @param {LazySet<string> | Set<string> | undefined} values resolution dependencies
 * @returns {number} retained lazy set depth
 */
const getDepth = (values) => {
	if (values === undefined || values instanceof Set) return 0;
	let depth = 0;
	for (const child of values._toDeepMerge || []) {
		depth = Math.max(depth, getDepth(child));
	}
	return depth + 1;
};

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	cache: { type: "memory" },
	module: {
		unsafeCache: false,
		rules: [{ test: /(?:barrel|first|second)\.js$/, sideEffects: false }]
	},
	plugins: [
		(compiler) => {
			const targets = new Set(
				["barrel.js", "first.js", "second.js"].map((name) =>
					path.join(compiler.context, name)
				)
			);
			/** @type {Map<string, { depths: number[], snapshot: Module["_incrementalResolveSnapshot"] }>} */
			const retained = new Map();
			compiler.hooks.normalModuleFactory.tap(
				"CheckResolveRetention",
				(factory) => {
					factory.hooks.beforeResolve.tap("CheckResolveRetention", (data) => {
						if (data.request === "./first.js") {
							data.contextDependencies.add(
								path.join(compiler.context, "metadata")
							);
						}
					});
				}
			);
			compiler.hooks.afterCompile.tap(
				"CheckResolveRetention",
				(compilation) => {
					if (!compiler.watchMode) return;
					const incremental =
						/** @type {import("webpack").Compilation & Compilation} */ (
							compilation
						)._incremental;
					for (const module of compilation.modules) {
						if (!targets.has(module.identifier())) continue;
						const dependencies = incremental.moduleResolveDependencies.get(
							/** @type {import("webpack").Module & Module} */ (module)
						);
						expect(dependencies).toBeDefined();
						if (dependencies === undefined) continue;
						const current = {
							depths: [
								getDepth(dependencies.fileDependencies),
								getDepth(dependencies.contextDependencies),
								getDepth(dependencies.missingDependencies)
							],
							snapshot: /** @type {import("webpack").Module & Module} */ (
								module
							)._incrementalResolveSnapshot
						};
						const previous = retained.get(module.identifier());
						if (Number(currentWatchStep.step) >= 2 && previous !== undefined) {
							expect(current.depths).toEqual(previous.depths);
							expect(current.snapshot).toBe(previous.snapshot);
						}
						retained.set(module.identifier(), current);
					}
					expect(retained.size).toBe(targets.size);
				}
			);
		}
	]
};
