"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	entry: {
		main: "./index.js"
	},
	output: {
		filename: "[name].js",
		resourceHints: { manifest: "hints.json" }
	},
	plugins: [
		new webpack.EntryPlugin(__dirname, "./other.js", { name: "__proto__" })
	]
};
