"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				// a loader makes the module re-factorizable on rebuilds
				test: /target\.js$/,
				use: path.resolve(__dirname, "loader.js")
			}
		]
	}
};
