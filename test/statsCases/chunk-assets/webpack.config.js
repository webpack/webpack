"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	devtool: "source-map",
	output: {
		filename: "bundle.js"
	}
};
