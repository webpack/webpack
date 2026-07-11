"use strict";

const path = require("node:path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	// custom loader-context values; must not clobber the runner's own fields
	loader: { context: "OVERRIDDEN" },
	module: {
		rules: [
			{
				test: /a\.js$/,
				use: path.resolve(__dirname, "loader.js")
			}
		]
	}
};
