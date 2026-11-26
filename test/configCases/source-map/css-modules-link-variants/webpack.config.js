"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: "source-map",
	entry: "./index.js",
	experiments: {
		css: true
	}
};
