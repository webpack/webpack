"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
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
		minimize: false
	}
};
