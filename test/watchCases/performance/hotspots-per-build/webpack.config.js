"use strict";

/**
 * Holds the main thread for the same stretch on every build.
 * @type {import("../../../../").WebpackPluginInstance}
 */
const burn = {
	apply(compiler) {
		compiler.hooks.compilation.tap("BurnPlugin", (compilation) => {
			compilation.hooks.afterSeal.tap("BurnPlugin", () => {
				const until = Date.now() + 130;

				while (Date.now() < until) {
					// Spinning on purpose.
				}
			});
		});
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "stats",
		hotspots: true
	},
	plugins: [burn]
};
