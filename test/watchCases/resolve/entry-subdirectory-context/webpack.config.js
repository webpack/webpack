"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	// entry lives below the context; re-factorizing must resolve the request
	// against the context, not against the entry module's own directory
	entry: "./src/index.js",
	output: {
		filename: "bundle.js"
	},
	module: {
		rules: [
			{
				// a loader makes the entry re-runnable through the factory pipeline
				test: /index\.js$/,
				use: path.resolve(__dirname, "loader.js")
			}
		]
	}
};
