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
				__filename,
				{
					dependency: path.resolve(__dirname, "optional.config.js"),
					optional: true
				}
			]
		}
	}
};
