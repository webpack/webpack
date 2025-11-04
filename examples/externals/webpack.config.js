"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	output: {
		libraryTarget: "umd"
	},
	externals: [
		"add",
		{
			subtract: {
				root: "subtract",
				commonjs2: "./subtract",
				commonjs: ["./math", "subtract"],
				amd: "subtract"
			}
		}
	]
};

module.exports = config;
