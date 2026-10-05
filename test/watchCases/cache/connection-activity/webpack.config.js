"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("../../../..").Configuration} */
module.exports = {
	entry: { main: "./index.js", trigger: "./tick.js" },
	experiments: { cacheUnaffected: true },
	output: { filename: "[name].js" },
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("ConnectionActivity", (compilation) => {
				compilation.hooks.optimizeDependencies.tap("ConnectionActivity", () => {
					for (const module of compilation.modules) {
						if (
							module.nameForCondition() !==
							path.join(compiler.context, "index.js")
						) {
							continue;
						}
						for (const connection of compilation.moduleGraph.getOutgoingConnections(
							module
						)) {
							connection.setActive(currentWatchStep.step !== "1");
						}
					}
				});
			});
		}
	]
};
