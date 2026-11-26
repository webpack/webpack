"use strict";

const holdMainThread = require("../../../helpers/holdMainThread");

/** @import { WebpackPluginInstance, Configuration } from "../../../../" */

/**
 * Holds the main thread for the same stretch on every build, keeping how long it really took.
 * @type {WebpackPluginInstance & { burned: number }}
 */
const burn = {
	burned: 0,
	apply(compiler) {
		compiler.hooks.compilation.tap("BurnPlugin", (compilation) => {
			compilation.hooks.afterSeal.tap("BurnPlugin", () => {
				const start = process.hrtime();
				holdMainThread(130);

				const [seconds, nanoseconds] = process.hrtime(start);

				burn.burned = seconds * 1000 + nanoseconds / 1e6;
			});
		});
	}
};

/** @type {Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "stats",
		hotspots: true
	},
	plugins: [burn]
};
