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

// The wrappers that hand the bundle to a loader rather than running it: an
// `amd` bundle needs `define` and a `system` one needs `System`, neither of
// which the harness has, so the case is compiled and read but not executed.
/** @type {import("../../../../").Configuration[]} */
module.exports = [variant("amd"), variant("system")];
