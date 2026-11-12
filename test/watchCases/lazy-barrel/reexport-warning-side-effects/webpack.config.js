"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = /** @type {const} */ ([
	["development", "memory", "warn"],
	["production", "filesystem", "warn"],
	["development", "memory", "error"]
]).map(([mode, type, exportsPresence], index) => ({
	mode,
	cache: { type },
	output: { filename: `bundle${index}.js`, clean: false },
	module: {
		unsafeCache: index === 0,
		parser: { javascript: { exportsPresence } }
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("CheckConnections", (compilation) => {
				compilation.hooks.finishModules.tap("CheckConnections", (modules) => {
					const { moduleGraph } = compilation;
					for (const module of modules) {
						/** @type {Set<import("webpack").Dependency>} */
						const dependencies = new Set();
						for (const connection of moduleGraph.getIncomingConnections(
							module
						)) {
							if (connection.dependency) {
								expect(dependencies.has(connection.dependency)).toBe(false);
								dependencies.add(connection.dependency);
							}
						}
					}
				});
			});
		}
	]
}));
