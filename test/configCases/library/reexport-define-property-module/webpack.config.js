"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	// Keep export names stable so named imports resolve by their source names.
	optimization: { mangleExports: false },
	output: {
		module: true,
		chunkFormat: "module",
		library: { type: "module" }
	}
};
