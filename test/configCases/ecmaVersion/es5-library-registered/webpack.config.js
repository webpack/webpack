"use strict";

/**
 * @param {import("../../../../declarations/WebpackOptions").LibraryType} type library type
 * @returns {import("../../../../").Configuration} configuration
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
/** @type {import("../../../../").Configuration[]} */
module.exports = [variant("amd"), variant("system")];
