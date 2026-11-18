"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.ts",
	experiments: {
		typescript: true
	},
	optimization: {
		minimize: false
	}
};
