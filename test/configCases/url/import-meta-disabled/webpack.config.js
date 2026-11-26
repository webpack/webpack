"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		name: "module",
		target: "node14",
		mode: "development",
		devtool: false,
		entry: "./module.js",
		output: { module: true, publicPath: "auto" },
		module: { parser: { javascript: { importMeta: false } } }
	},
	{
		name: "script",
		target: "node14",
		mode: "development",
		devtool: false,
		entry: "./script.js",
		module: { parser: { javascript: { importMeta: { url: false } } } }
	}
];
