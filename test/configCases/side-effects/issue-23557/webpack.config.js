"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ mode: "development" },
	{ mode: "development", optimization: { sideEffects: true } },
	{ mode: "development", optimization: { usedExports: true } },
	{ mode: "production", optimization: { usedExports: false } },
	{ mode: "production" }
].map((config) => ({
	...config,
	devtool: false,
	optimization: {
		...config.optimization,
		concatenateModules: false,
		minimize: false
	}
}));
