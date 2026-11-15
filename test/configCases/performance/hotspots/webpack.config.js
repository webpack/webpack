"use strict";

const holdMainThread = require("../../../helpers/holdMainThread");

/**
 * Holds the main thread for a known stretch, which is what the hint measures.
 * @param {number} ms how long to burn
 * @returns {import("../../../../").WebpackPluginInstance} the plugin
 */
const burn = (ms) => ({
	apply(compiler) {
		compiler.hooks.compilation.tap("BurnPlugin", (compilation) => {
			compilation.hooks.afterSeal.tap("BurnPlugin", () => {
				holdMainThread(ms);
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
	plugins: [burn(160)]
};
