"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	devtool: "source-map",
	output: {
		filename: "bundle.js"
	}
};
