"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /[\\/]module\.js$/,
				use: path.resolve(__dirname, "loader.js")
			}
		]
	}
};
