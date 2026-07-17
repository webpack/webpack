"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: ["web", "node"],
	output: {
		module: true,
		filename: "bundle.mjs"
	},
	experiments: {
		outputModule: true
	},
	optimization: {
		minimize: false
	}
};
