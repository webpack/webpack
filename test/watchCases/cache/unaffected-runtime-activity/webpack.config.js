"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("../../../..").Configuration[]} */
module.exports = Array.from({ length: 4 }, (_, index) => ({
	mode: "development",
	target: "node",
	devtool: false,
	entry: { a: "./a.js", b: "./b.js", tick: "./tick.js" },
	cache: { type: index % 2 === 0 ? "memory" : "filesystem" },
	experiments: { cacheUnaffected: true },
	output: { filename: `${index}-[name].js`, clean: false },
	optimization: {
		splitChunks:
			index < 2
				? false
				: {
						chunks: "all",
						minSize: 0,
						cacheGroups: {
							default: false,
							defaultVendors: false,
							shared: { test: /wrapper|effect/, name: "shared", enforce: true }
						}
					}
	},
	plugins: [
		(compiler) => {
			const inactiveState =
				index < 2
					? false
					: compiler.webpack.ModuleGraphConnection.TRANSITIVE_ONLY;
			compiler.hooks.compilation.tap("RuntimeActivity", (compilation) => {
				compilation.hooks.optimizeDependencies.tap("RuntimeActivity", () => {
					const activeRuntime =
						currentWatchStep.step === "1" || currentWatchStep.step === "2"
							? "b"
							: "a";
					for (const module of compilation.modules) {
						if (
							module.nameForCondition() !==
							path.join(compiler.context, "wrapper.js")
						) {
							continue;
						}
						for (const connection of compilation.moduleGraph.getOutgoingConnections(
							module
						)) {
							connection.addCondition(
								(_connection, runtime) =>
									runtime === undefined ||
									(typeof runtime === "string"
										? runtime === activeRuntime
										: runtime.has(activeRuntime)) ||
									inactiveState
							);
						}
					}
				});
				compilation.hooks.afterOptimizeChunkIds.tap("RuntimeActivity", () => {
					for (const module of compilation.modules) {
						if (
							module.nameForCondition() !==
							path.join(compiler.context, "wrapper.js")
						) {
							continue;
						}
						// Cache the runtime key before changing only the iteration order.
						for (const runtime of compilation.chunkGraph.getModuleRuntimes(
							module
						)) {
							if (runtime !== undefined && typeof runtime !== "string") {
								if (currentWatchStep.step === "0") {
									runtime.sortWith((a, b) => (a < b ? 1 : -1));
								} else {
									runtime.sort();
								}
							}
						}
					}
				});
			});
		}
	]
}));
