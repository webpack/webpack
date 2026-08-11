"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /index\.js$/,
				use: path.resolve(__dirname, "loader.js")
			}
		]
	}
};
