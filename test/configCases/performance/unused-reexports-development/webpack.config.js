"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	optimization: {
		minimize: false
	},
	performance: {
		hints: "stats",
		unusedReexports: true
	}
};
