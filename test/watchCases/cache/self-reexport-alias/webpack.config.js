"use strict";

/** @type {import("webpack").Configuration[]} */
module.exports = [false, true].map((concatenateModules, index) => ({
	mode: "production",
	cache: false,
	output: { filename: `bundle${index}.js`, clean: false },
	optimization: {
		sideEffects: true,
		usedExports: true,
		concatenateModules,
		minimize: false,
		mangleExports: false
	}
}));
