"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: ["web", "node"],
	mode: "development",
	experiments: {
		css: true,
		outputModule: true
	},
	output: {
		module: true
	}
};
