"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	module: {
		rules: [
			{
				test: /\.css$/,
				loader: "css-loader"
			}
		]
	}
};

module.exports = config;
