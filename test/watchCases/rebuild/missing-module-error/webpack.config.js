"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				// a loader makes the module re-factorizable on rebuilds
				test: /(index|foo)\.js$/,
				use: path.resolve(__dirname, "loader.js")
			}
		]
	}
};
