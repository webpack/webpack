"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [false, true].map((concatenateModules) => ({
	mode: "production",
	module: {
		rules: [
			{
				test: /\.cjs$/,
				exclude: /effectful/,
				sideEffects: false
			}
		]
	},
	optimization: {
		minimize: false,
		concatenateModules
	}
}));
