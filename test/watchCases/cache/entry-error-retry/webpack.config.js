"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: {
		main: "./index.js",
		broken: "./missing.js"
	},
	output: {
		filename: "[name].js"
	}
};
