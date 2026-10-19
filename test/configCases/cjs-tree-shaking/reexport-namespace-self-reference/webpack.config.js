"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	module: {
		rules: [
			{
				test: /\.cjs$/,
				sideEffects: false
			}
		]
	},
	optimization: {
		minimize: false
	}
};
