"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: {
		main: "./index.js",
		changing: "./changing.js"
	},
	output: {
		filename: "[name].js"
	}
};
