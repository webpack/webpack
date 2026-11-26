"use strict";

/** @import { LibraryOptions, Configuration } from "../../../../" */

/**
 * @param {LibraryOptions} library library options
 * @param {string} entry entry module
 * @returns {Configuration} configuration
 */
const libraryConfig = (library, entry = "./lib.js") => ({
	target: "node",
	entry,
	output: { library }
});

/** @type {Configuration[]} */
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
