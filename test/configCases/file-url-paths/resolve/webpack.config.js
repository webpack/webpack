"use strict";

const path = require("path");
const { pathToFileURL } = require("url");

// resolve options that take paths (modules, roots, restrictions, tsconfig) now
// accept file URL instances; enhanced-resolve resolves them.
// Schema validation support for file URLs is handled separately.
/** @type {import("../../../../").Configuration} */
module.exports = {
	validate: false,
	resolve: {
		modules: [pathToFileURL(path.join(__dirname, "modules")), "node_modules"]
	}
};
