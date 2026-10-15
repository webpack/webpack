"use strict";

/**
 * Holds the main thread for the same stretch on every build, keeping how long it really took.
 * @type {import("../../../../").WebpackPluginInstance}
 */
const burn = {
	burned: 0,
	apply(compiler) {
		compiler.hooks.compilation.tap("BurnPlugin", (compilation) => {
			compilation.hooks.afterSeal.tap("BurnPlugin", () => {
				const start = process.hrtime();
				const until = Date.now() + 130;

				while (Date.now() < until) {
					// Spinning on purpose.
				}

				const [seconds, nanoseconds] = process.hrtime(start);

				burn.burned = seconds * 1000 + nanoseconds / 1e6;
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
