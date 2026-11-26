"use strict";

const createLazyMakeTest = require("../_helpers/createLazyMakeTest");

/** @import { Configuration } from "../../../../" */

/** @type {(concatenateModules: boolean) => Configuration} */
const config = (concatenateModules) => ({
	mode: "production",
	optimization: {
		sideEffects: true,
		providedExports: true,
		usedExports: true,
		concatenateModules,
		minimize: false
	},
	plugins: [
		(compiler) => {
			compiler.hooks.thisCompilation.tap("Test", (compilation) => {
				// before side effects optimization, one connection per dependency
				compilation.hooks.finishModules.tap("Test", (modules) => {
					const { moduleGraph } = compilation;
					for (const module of modules) {
						const seen = new Set();
						for (const connection of moduleGraph.getOutgoingConnections(
							module
						)) {
							if (!connection.dependency) continue;
							expect(seen.has(connection.dependency)).toBe(false);
							seen.add(connection.dependency);
						}
					}
				});
			});
		}
	]
});

/** @type {Configuration[]} */
module.exports = createLazyMakeTest([], [config(true), config(false)]);
