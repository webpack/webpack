"use strict";

/** @import { Configuration } from "../../../../" */

/**
 * @param {string} entry entry
 * @param {Configuration["output"]} output output options under test
 * @returns {Configuration} configuration
 */
const config = (entry, output) => ({
	entry,
	mode: "production",
	devtool: false,
	output,
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		usedExports: true,
		moduleIds: "named",
		chunkIds: "named"
	}
});

/** @type {Configuration[]} */
module.exports = [
	// the error is cached and re-thrown; the body never runs a second time
	config("./error-handling.js", { strictModuleErrorHandling: true }),
	// the memo is dropped, so the next access runs the body again
	config("./exception-handling.js", { strictModuleExceptionHandling: true })
];
