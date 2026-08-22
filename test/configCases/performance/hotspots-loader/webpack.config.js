"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /src[\\/]m\d\.js$/,
				use: path.resolve(__dirname, "slow-loader.js")
			}
		]
	},
	performance: {
		hints: "warning",
		hotspots: true
	}
};
