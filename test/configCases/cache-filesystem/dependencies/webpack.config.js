"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
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
