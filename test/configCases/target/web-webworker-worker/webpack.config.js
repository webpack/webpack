"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "webworker"],
	output: {
		module: true,
		filename: "[name].mjs"
	},
	experiments: {
		outputModule: true
	}
};
