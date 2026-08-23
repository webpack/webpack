"use strict";

/**
 * Holds the main thread for a known stretch, which is what the hint measures.
 * @param {number} ms how long to burn
 * @returns {import("../../../../").WebpackPluginInstance} the plugin
 */
const burn = (ms) => ({
	apply(compiler) {
		compiler.hooks.compilation.tap("BurnPlugin", (compilation) => {
			compilation.hooks.afterSeal.tap("BurnPlugin", () => {
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
		hints: false,
		hotspots: true
	},
	plugins: [burn(160)]
};
