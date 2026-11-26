"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	node: { __dirname: false, __filename: false },
	mode: "development",
	devtool: "source-map",
	experiments: { css: true }
};
