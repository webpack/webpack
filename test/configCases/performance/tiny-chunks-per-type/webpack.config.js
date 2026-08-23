"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false,
		splitChunks: {
			minSize: {
				javascript: 1
			}
		}
	},
	performance: {
		hints: "warning",
		tinyChunks: true
	}
};
