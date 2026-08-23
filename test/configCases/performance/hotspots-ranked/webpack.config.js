"use strict";

/**
 * Holds the main thread for a known stretch under one compilation hook.
 * @param {string} name the plugin name the report should carry
 * @param {"optimizeModules" | "afterSeal"} hook where it burns
 * @param {number} ms how long to burn
 * @returns {import("../../../../").WebpackPluginInstance} the plugin
 */
const burn = (name, hook, ms) => ({
	apply(compiler) {
		compiler.hooks.compilation.tap(name, (compilation) => {
			compilation.hooks[hook].tap(name, () => {
				const until = Date.now() + ms;

				while (Date.now() < until) {
					// Spinning on purpose.
				}
			});
		});
	}
});

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		hotspots: true
	},
	plugins: [
		burn("SlowSealPlugin", "afterSeal", 200),
		burn("SlowModulesPlugin", "optimizeModules", 120)
	]
};
