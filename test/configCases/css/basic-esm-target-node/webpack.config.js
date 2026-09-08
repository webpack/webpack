"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	experiments: {
		css: true
	},
	output: {
		module: true,
		chunkFormat: "module"
	}
};
