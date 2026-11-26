"use strict";

const holdMainThread = require("../../../helpers/holdMainThread");

/** @import { WebpackPluginInstance, Configuration } from "../../../../" */

/**
 * Holds the main thread for a known stretch, which is what the hint measures.
 * @param {number} ms how long to burn
 * @returns {WebpackPluginInstance} the plugin
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

/** @type {Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "stats",
		hotspots: true
	},
	plugins: [burn(160)]
};
