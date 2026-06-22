"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	// Keep export names stable so named imports resolve by their source names.
	optimization: { mangleExports: false },
	output: {
		module: true,
		chunkFormat: "module",
		library: { type: "module" }
	},
	experiments: {
		outputModule: true
	}
};
