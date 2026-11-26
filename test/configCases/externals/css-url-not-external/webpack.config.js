"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	node: { __dirname: false },
	externalsType: "commonjs",
	externals: [/icon\.png$/],
	experiments: { css: true }
};
