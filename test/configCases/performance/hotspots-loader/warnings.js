"use strict";

/**
 * @param {import("../../../../").Configuration} config the configuration
 * @returns {(RegExp[])[]} what the build is expected to report
 */
module.exports = (config) =>
	// A restored module never runs its loaders, so with a warm filesystem cache
	// there is genuinely no loader time to report.
	config.cache && config.cache.type === "filesystem"
		? []
		: [
				[
					/hotspots: 1 thing holds the main thread long enough to be worth looking at/,
					// A loader is not a tap, so this line is what proves loaders are
					// measured too; the figure is a measurement, so only its shape is.
					/\n {2}loader \.\/slow-loader\.js \(\d+ ms over 6 runs\)/
				]
			];
