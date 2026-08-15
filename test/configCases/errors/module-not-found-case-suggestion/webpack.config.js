"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	// An absolute module directory is looked up as-is, a relative one at every
	// level above the request.
	resolve: {
		modules: [path.resolve(__dirname, "node_modules"), "node_modules"]
	}
};
