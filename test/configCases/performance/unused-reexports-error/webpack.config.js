"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false
	},
	performance: {
		hints: "error",
		unusedReexports: true
	}
};
