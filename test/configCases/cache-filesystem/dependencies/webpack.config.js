"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	cache: {
		type: "filesystem",
		buildDependencies: {
			config: [
				path.resolve(__dirname, "./foo.mjs"),
				path.resolve(__dirname, "./webpack.config.js")
			]
		}
	}
};
