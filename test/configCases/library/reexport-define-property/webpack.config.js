"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	// Keep export names stable so the test can assert on them by name.
	optimization: { mangleExports: false },
	output: {
		library: { type: "commonjs-module" }
	}
};
