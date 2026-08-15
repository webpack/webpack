"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.js",
	// An absolute module directory is looked up as-is, a relative one at every
	// level above the request
	resolve: { modules: [path.resolve(__dirname, "shared"), "node_modules"] }
};
