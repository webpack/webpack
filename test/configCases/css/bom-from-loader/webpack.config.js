"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	module: {
		rules: [
			{
				test: /\.css$/i,
				type: "css/auto",
				use: [path.resolve(__dirname, "loader.js")]
			}
		]
	},
	experiments: {
		css: true
	}
};
