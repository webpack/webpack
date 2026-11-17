"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	resolve: {
		// a directory whose path is a prefix of the context's, but not its parent
		modules: [path.resolve(__dirname, "app"), "node_modules"]
	}
};
