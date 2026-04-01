"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// "development",
	"production"
].map((mode) => ({
	name: mode,
	devtool: false,
	entry: "./index.js",
	mode,
	target: "web",
	optimization: {
		minimize: false
	},
	experiments: {
		css: true
	}
}));
