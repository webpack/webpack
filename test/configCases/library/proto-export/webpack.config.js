"use strict";

/**
 * @param {import("../../../../").LibraryOptions} library library options
 * @param {string} entry entry module
 * @returns {import("../../../../").Configuration} configuration
 */
const libraryConfig = (library, entry = "./lib.js") => ({
	target: "node",
	entry,
	output: { library }
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	libraryConfig({ type: "commonjs" }),
	libraryConfig({ type: "commonjs-static" }),
	libraryConfig({ type: "this" }),
	libraryConfig({ type: "commonjs", export: "default" }, "./lib-default.js"),
	{
		target: "node",
		entry: "./index.js"
	}
];
