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
		library: type === "commonjs2" ? { type } : { type, name: "L" }
	}
});

// Every library wrapper is code webpack writes around the bundle, so each one
// carries the same es5 obligation as the runtime inside it. The types that need
// a loader in scope are in `es5-library-registered`, which cannot run them.
/** @type {import("../../../../").Configuration[]} */
module.exports = [
	variant("var"),
	variant("assign"),
	variant("window"),
	variant("umd"),
	variant("commonjs2")
];
