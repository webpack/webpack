"use strict";

/** @type {(concatenateModules: boolean) => import("../../../../").Configuration} */
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

/** @type {import("../../../../").Configuration[]} */
module.exports = [config(true), config(false)];
