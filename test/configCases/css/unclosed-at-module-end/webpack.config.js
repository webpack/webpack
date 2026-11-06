"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "web",
		mode: "development",
		node: { __dirname: false, __filename: false },
		experiments: { css: true }
	},
	{
		target: "web",
		mode: "development",
		output: { pathinfo: false },
		node: { __dirname: false, __filename: false },
		experiments: { css: true }
	},
	{
		target: "web",
		mode: "production",
		devtool: false,
		node: { __dirname: false, __filename: false },
		experiments: { css: true }
	}
];
