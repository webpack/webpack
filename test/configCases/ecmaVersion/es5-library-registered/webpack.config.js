"use strict";

/** @import { LibraryType } from "../../../../declarations/WebpackOptions.js" */
/** @import { Configuration } from "../../../../" */

/**
 * @param {LibraryType} type library type
 * @returns {Configuration} configuration
 */
const variant = (type) => ({
	name: type,
	target: ["web", "es5"],
	entry: "./index.js",
	output: {
		filename: `${type}.js`,
		library: { type }
	}
});

// `amd` needs `define` and `system` needs `System`, neither of which the
// harness has, so these are compiled and read but not executed.
/** @type {Configuration[]} */
module.exports = [variant("amd"), variant("system")];
