"use strict";

const path = require("path");
const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: {
		a: "./a",
		b: "./b"
	},
	output: {
		filename: "MyDll.[name].js",
		library: "[name]_[fullhash]"
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.resolve(
				__dirname,
				"../../../js/config/dll-plugin/manifest_without_string_template.json"
			)
		})
	]
};
