"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: ["./first.js", "./second.js", "./index.js"],
	optimization: {
		minimize: false
	},
	output: {
		library: { type: "commonjs2" }
	},
	performance: {
		hints: "warning",
		mixedExports: true
	}
};
