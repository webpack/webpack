"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		target: "web",
		mode: "development",
		node: { __dirname: false, __filename: false },
		experiments: { css: true }
	},
	{
		target: "web",
		mode: "production",
		devtool: false,
		optimization: { minimize: true, minimizer: ["..."] },
		node: { __dirname: false, __filename: false },
		experiments: { css: true }
	}
];
