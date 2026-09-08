"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	output: {
		module: true,
		filename: "bundle0.mjs"
	},
	entry: ["./first.js", "./index.js"]
};
