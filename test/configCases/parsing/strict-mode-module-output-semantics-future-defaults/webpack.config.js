"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	output: {
		module: true,
		chunkFormat: "module",
		library: { type: "module" }
	},
	experiments: {
		outputModule: true,
		futureDefaults: true
	}
};
